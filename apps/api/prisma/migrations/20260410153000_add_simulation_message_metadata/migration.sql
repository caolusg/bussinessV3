ALTER TABLE "simulation_messages"
  ADD COLUMN IF NOT EXISTS "assessment_json" JSONB,
  ADD COLUMN IF NOT EXISTS "trace_json" JSONB,
  ADD COLUMN IF NOT EXISTS "persona_json" JSONB;
