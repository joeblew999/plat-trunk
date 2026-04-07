-- zanzo_tuples — permission tuple store for @zanzojs/better-auth.
-- Run once before first use: wrangler d1 migrations apply zano-db --local
-- Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS zanzo_tuples (
  subject  TEXT NOT NULL,
  relation TEXT NOT NULL,
  object   TEXT NOT NULL,
  UNIQUE(subject, relation, object)
);

CREATE INDEX IF NOT EXISTS idx_zanzo_subject_relation ON zanzo_tuples (subject, relation);
CREATE INDEX IF NOT EXISTS idx_zanzo_object_relation  ON zanzo_tuples (object, relation);
CREATE INDEX IF NOT EXISTS idx_zanzo_subject_object   ON zanzo_tuples (subject, object);
