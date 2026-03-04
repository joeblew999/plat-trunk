-- ADR-0036 Step 8: Persistent op log for truck-sync CRDT
-- Each row is one operation applied to a model's Automerge doc.
-- op_json mirrors the Op schema in systems/sync/crate/src/lib.rs.

CREATE TABLE IF NOT EXISTS op_log (
    model_id  TEXT    NOT NULL,
    op_index  INTEGER NOT NULL,
    op_json   TEXT    NOT NULL,
    actor_id  TEXT    NOT NULL,
    ts        INTEGER NOT NULL,
    PRIMARY KEY (model_id, op_index)
);

CREATE INDEX IF NOT EXISTS op_log_model_ts ON op_log (model_id, ts);
