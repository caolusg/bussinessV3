CREATE TABLE IF NOT EXISTS "business_stages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" "SimulationStage" NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "title_zh" TEXT NOT NULL,
  "title_en" TEXT,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_stages_key_key" ON "business_stages"("key");
CREATE INDEX IF NOT EXISTS "business_stages_sort_order_idx" ON "business_stages"("sort_order");

CREATE TABLE IF NOT EXISTS "stage_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stage_id" UUID NOT NULL,
  "task_code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "sub_goal" TEXT,
  "tip_title" TEXT,
  "tip_content" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stage_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stage_tasks_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stage_tasks_task_code_key" ON "stage_tasks"("task_code");
CREATE INDEX IF NOT EXISTS "stage_tasks_stage_default_active_idx" ON "stage_tasks"("stage_id", "is_default", "is_active");

CREATE TABLE IF NOT EXISTS "learning_resources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stage_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "example" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_resources_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_resources_stage_type_term_unique" ON "learning_resources"("stage_id", "type", "term");
CREATE INDEX IF NOT EXISTS "learning_resources_stage_type_sort_idx" ON "learning_resources"("stage_id", "type", "sort_order");

CREATE TABLE IF NOT EXISTS "stage_ai_scenarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stage_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "opponent_name" TEXT,
  "opponent_role" TEXT,
  "system_prompt" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL DEFAULT 'standard',
  "prompt_version" TEXT NOT NULL DEFAULT 'v1',
  "is_default" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stage_ai_scenarios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stage_ai_scenarios_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stage_ai_scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stage_ai_scenarios_stage_default_active_idx" ON "stage_ai_scenarios"("stage_id", "is_default", "is_active");

ALTER TABLE "simulation_sessions"
  ADD COLUMN IF NOT EXISTS "stage_id" UUID,
  ADD COLUMN IF NOT EXISTS "task_id" UUID,
  ADD COLUMN IF NOT EXISTS "scenario_id" UUID,
  ADD COLUMN IF NOT EXISTS "title" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'simulation_sessions_stage_id_fkey'
  ) THEN
    ALTER TABLE "simulation_sessions"
      ADD CONSTRAINT "simulation_sessions_stage_id_fkey"
      FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'simulation_sessions_task_id_fkey'
  ) THEN
    ALTER TABLE "simulation_sessions"
      ADD CONSTRAINT "simulation_sessions_task_id_fkey"
      FOREIGN KEY ("task_id") REFERENCES "stage_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'simulation_sessions_scenario_id_fkey'
  ) THEN
    ALTER TABLE "simulation_sessions"
      ADD CONSTRAINT "simulation_sessions_scenario_id_fkey"
      FOREIGN KEY ("scenario_id") REFERENCES "stage_ai_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "simulation_sessions_stage_id_idx" ON "simulation_sessions"("stage_id");

CREATE TABLE IF NOT EXISTS "practice_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "stage_id" UUID,
  "session_id" UUID,
  "resource_id" UUID,
  "event_type" TEXT NOT NULL,
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "practice_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "practice_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "practice_events_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "practice_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "simulation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "practice_events_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "practice_events_user_created_idx" ON "practice_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "practice_events_stage_event_created_idx" ON "practice_events"("stage_id", "event_type", "created_at");

CREATE TABLE IF NOT EXISTS "ai_interaction_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "session_id" UUID,
  "message_id" UUID,
  "stage_id" UUID,
  "provider" TEXT,
  "model" TEXT,
  "prompt_version" TEXT,
  "system_prompt" TEXT,
  "input_messages_json" JSONB,
  "output_text" TEXT,
  "output_json" JSONB,
  "latency_ms" INTEGER,
  "degraded" BOOLEAN NOT NULL DEFAULT false,
  "error_code" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_interaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_interaction_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "simulation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_interaction_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "simulation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_interaction_logs_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_interaction_logs_user_created_idx" ON "ai_interaction_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_interaction_logs_session_created_idx" ON "ai_interaction_logs"("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_interaction_logs_stage_created_idx" ON "ai_interaction_logs"("stage_id", "created_at");

CREATE TABLE IF NOT EXISTS "message_analysis_results" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL,
  "user_id" UUID,
  "session_id" UUID,
  "stage_id" UUID,
  "analysis_version" TEXT NOT NULL,
  "language_quality_json" JSONB,
  "business_strategy_json" JSONB,
  "trade_term_usage_json" JSONB,
  "error_tags_json" JSONB,
  "score_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_analysis_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "message_analysis_results_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "simulation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "message_analysis_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "message_analysis_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "simulation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "message_analysis_results_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "business_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "message_analysis_results_user_created_idx" ON "message_analysis_results"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "message_analysis_results_stage_created_idx" ON "message_analysis_results"("stage_id", "created_at");

CREATE TABLE IF NOT EXISTS "student_learning_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "summary_json" JSONB,
  "strengths_json" JSONB,
  "weaknesses_json" JSONB,
  "stage_preferences_json" JSONB,
  "resource_usage_summary_json" JSONB,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_learning_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_learning_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_learning_snapshots_user_unique" ON "student_learning_snapshots"("user_id");
