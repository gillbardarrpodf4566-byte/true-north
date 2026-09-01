import { createHash } from "node:crypto";
import { getDb } from "./db";

export type ExternalImportKind = "history" | "practice" | "wrong";

export interface ExternalImportClaim {
  status: "created" | "already_imported";
  digest: string;
}

/** Stable semantic digest: object keys are canonicalized so whitespace/key ordering retries are idempotent. */
export function externalImportDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).sort().join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Server idempotency ledger for authenticated external imports.
 * The exact duplicate returns already_imported without a new side effect; revised data gets a new digest
 * and the client can explicitly surface it as a distinct import rather than silently merging it.
 */
export function claimExternalImport(input: {
  userId: number;
  kind: ExternalImportKind;
  sourceLabel: string;
  parserVersion: string;
  records: unknown;
}): ExternalImportClaim {
  const digest = externalImportDigest({ kind: input.kind, sourceLabel: input.sourceLabel.trim(), records: input.records });
  const db = getDb();
  const existing = db.prepare(
    "SELECT id FROM external_import_batches WHERE owner_key = ? AND kind = ? AND content_digest = ?",
  ).get(`user:${input.userId}`, input.kind, digest) as { id: number } | undefined;
  if (existing) return { status: "already_imported", digest };
  db.prepare(
    `INSERT INTO external_import_batches (owner_key, kind, source_label, content_digest, parser_version, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(`user:${input.userId}`, input.kind, input.sourceLabel.trim(), digest, input.parserVersion, canonicalJson(input.records), new Date().toISOString());
  return { status: "created", digest };
}
