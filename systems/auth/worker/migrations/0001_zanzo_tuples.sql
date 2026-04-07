-- zanzo_tuples — ReBAC permission tuple store for @zanzojs/better-auth.
-- Applied to AUTH_DB alongside the better-auth tables.
-- Safe to re-run (IF NOT EXISTS). Also available programmatically via POST /zano/migrate.

CREATE TABLE IF NOT EXISTS zanzo_tuples (
  subject  TEXT NOT NULL,
  relation TEXT NOT NULL,
  object   TEXT NOT NULL,
  UNIQUE(subject, relation, object)
);

CREATE INDEX IF NOT EXISTS idx_zanzo_subject_relation ON zanzo_tuples (subject, relation);
CREATE INDEX IF NOT EXISTS idx_zanzo_object_relation  ON zanzo_tuples (object, relation);
CREATE INDEX IF NOT EXISTS idx_zanzo_subject_object   ON zanzo_tuples (subject, object);
