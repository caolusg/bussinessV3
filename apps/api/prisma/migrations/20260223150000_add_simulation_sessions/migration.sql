-- Create simulation sessions and messages
CREATE TABLE IF NOT EXISTS "simulation_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NULL,
  "stage" TEXT NOT NULL,
  "attempt_no" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "simulation_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "simulation_sessions_user_stage_status_idx"
  ON "simulation_sessions" ("user_id", "stage", "status");

CREATE TABLE IF NOT EXISTS "simulation_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "coach_note" TEXT NULL,
  "turn_index" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "simulation_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "simulation_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "simulation_messages_session_turn_idx"
  ON "simulation_messages" ("session_id", "turn_index");
