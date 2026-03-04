// op-log.ts — D1 CRUD for the truck-sync op log (ADR-0036 Step 8).
//
// Mirrors the Op schema from systems/sync/crate/src/lib.rs.
// Server-side: op log is append-only. Enabled/disabled state lives
// in the Automerge doc (in R2), not here. The D1 table is for fast
// range-fetch (incremental sync) without re-downloading the full doc.

export interface OpRow {
  model_id: string;
  op_index: number;
  op_json: string;
  actor_id: string;
  ts: number;
}

export async function appendOp(db: D1Database, row: OpRow): Promise<void> {
  await db.prepare(
    'INSERT OR IGNORE INTO op_log (model_id, op_index, op_json, actor_id, ts) VALUES (?, ?, ?, ?, ?)'
  ).bind(row.model_id, row.op_index, row.op_json, row.actor_id, row.ts).run();
}

export async function getOpsSince(db: D1Database, modelId: string, sinceIndex: number): Promise<OpRow[]> {
  const result = await db.prepare(
    'SELECT model_id, op_index, op_json, actor_id, ts FROM op_log WHERE model_id = ? AND op_index > ? ORDER BY op_index ASC'
  ).bind(modelId, sinceIndex).all<OpRow>();
  return result.results;
}

export async function countOps(db: D1Database, modelId: string): Promise<number> {
  const row = await db.prepare(
    'SELECT COUNT(*) as n FROM op_log WHERE model_id = ?'
  ).bind(modelId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function deleteOps(db: D1Database, modelId: string): Promise<void> {
  await db.prepare('DELETE FROM op_log WHERE model_id = ?').bind(modelId).run();
}
