import type { PGlite } from '@electric-sql/pglite'

const migration = `
CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, name text NOT NULL, checksum text NOT NULL, applied_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS tasks(id uuid PRIMARY KEY, series_id uuid, parent_id uuid REFERENCES tasks(id), title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 200), description text NOT NULL DEFAULT '', status text NOT NULL CHECK(status IN ('todo','planned','doing','paused','done')), priority text CHECK(priority IS NULL OR priority IN ('low','medium','high','urgent')), start_at timestamptz, due_at timestamptz, estimated_minutes integer NOT NULL DEFAULT 0 CHECK(estimated_minutes BETWEEN 0 AND 5256000), actual_minutes integer NOT NULL DEFAULT 0 CHECK(actual_minutes BETWEEN 0 AND 5256000), completed_at timestamptz, scheduled_occurrence_at timestamptz, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz, CHECK(parent_id IS NULL OR parent_id <> id));
CREATE TABLE IF NOT EXISTS memos(id uuid PRIMARY KEY, related_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL, title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 200), body text NOT NULL DEFAULT '', is_pinned boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz);
CREATE TABLE IF NOT EXISTS tags(id uuid PRIMARY KEY, name text NOT NULL, normalized_name text NOT NULL UNIQUE, color text NOT NULL DEFAULT 'emerald', created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS task_tags(task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(task_id,tag_id));
CREATE TABLE IF NOT EXISTS memo_tags(memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE, tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(memo_id,tag_id));
CREATE TABLE IF NOT EXISTS reminders(id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, offset_minutes integer NOT NULL CHECK(offset_minutes IN (0,5,60,1440)), target_due_at timestamptz, notified_at timestamptz, created_at timestamptz NOT NULL, UNIQUE(task_id,offset_minutes));
CREATE TABLE IF NOT EXISTS recurrence_rules(id uuid PRIMARY KEY, task_id uuid NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE, frequency text NOT NULL CHECK(frequency IN ('daily','weekly','monthly','yearly')), interval integer NOT NULL CHECK(interval > 0), weekdays jsonb, month_day integer, use_month_end boolean NOT NULL DEFAULT false, year_month integer, year_day integer, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS attachments(id uuid PRIMARY KEY, owner_type text NOT NULL CHECK(owner_type IN ('task','memo')), task_id uuid REFERENCES tasks(id) ON DELETE CASCADE, memo_id uuid REFERENCES memos(id) ON DELETE CASCADE, file_name text NOT NULL, mime_type text NOT NULL CHECK(mime_type='image/webp'), byte_size integer NOT NULL CHECK(byte_size <= 2097152), width integer NOT NULL, height integer NOT NULL, sort_order integer NOT NULL, data bytea NOT NULL, created_at timestamptz NOT NULL, CHECK((owner_type='task' AND task_id IS NOT NULL AND memo_id IS NULL) OR (owner_type='memo' AND memo_id IS NOT NULL AND task_id IS NULL)));
CREATE TABLE IF NOT EXISTS settings(key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status,deleted_at,updated_at DESC,id DESC); CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_at,deleted_at,id); CREATE INDEX IF NOT EXISTS tasks_start_idx ON tasks(start_at,deleted_at,id); CREATE INDEX IF NOT EXISTS tasks_parent_idx ON tasks(parent_id,deleted_at); CREATE UNIQUE INDEX IF NOT EXISTS tasks_occurrence_idx ON tasks(series_id,scheduled_occurrence_at) WHERE scheduled_occurrence_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS memos_order_idx ON memos(is_pinned DESC,updated_at DESC,id DESC); CREATE INDEX IF NOT EXISTS memos_task_idx ON memos(related_task_id,deleted_at); CREATE INDEX IF NOT EXISTS task_tags_tag_idx ON task_tags(tag_id,task_id); CREATE INDEX IF NOT EXISTS memo_tags_tag_idx ON memo_tags(tag_id,memo_id); CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders(target_due_at,notified_at);
`

export async function migrate(client: PGlite) {
  await client.exec(migration)
  await client.query(
    `INSERT INTO schema_migrations(version,name,checksum,applied_at) VALUES(1,'initial','v1',now()) ON CONFLICT(version) DO NOTHING`,
  )
  await client.query(
    `INSERT INTO settings(key,value,updated_at) VALUES('initialized','true'::jsonb,now()) ON CONFLICT(key) DO NOTHING`,
  )
}
