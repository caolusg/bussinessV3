-- Add unique constraints for simulation tables
CREATE UNIQUE INDEX IF NOT EXISTS "simulation_messages_session_turn_unique"
  ON "simulation_messages" ("session_id", "turn_index");

CREATE UNIQUE INDEX IF NOT EXISTS "simulation_sessions_user_stage_attempt_unique"
  ON "simulation_sessions" ("user_id", "stage", "attempt_no");
