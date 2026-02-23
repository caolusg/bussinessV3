DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'SimulationStage'
  ) THEN
    CREATE TYPE "SimulationStage" AS ENUM (
      'acquisition',
      'quotation',
      'negotiation',
      'contract',
      'preparation',
      'customs',
      'settlement',
      'after_sales'
    );
  END IF;
END$$;

ALTER TABLE "simulation_sessions"
  ALTER COLUMN "stage" TYPE "SimulationStage"
  USING ("stage"::"SimulationStage");
