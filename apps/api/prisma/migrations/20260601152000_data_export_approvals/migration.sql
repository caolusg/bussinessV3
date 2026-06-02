ALTER TABLE "user_data_export_audits"
  ADD COLUMN "approved_by_user_id" uuid,
  ADD COLUMN "status" text NOT NULL DEFAULT 'downloaded',
  ADD COLUMN "review_note" text,
  ADD COLUMN "approved_at" timestamptz(6),
  ADD COLUMN "rejected_at" timestamptz(6),
  ADD COLUMN "downloaded_at" timestamptz(6),
  ADD COLUMN "expires_at" timestamptz(6);

UPDATE "user_data_export_audits"
SET "downloaded_at" = "created_at"
WHERE "downloaded_at" IS NULL;

ALTER TABLE "user_data_export_audits"
  ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "user_data_export_audits"
  ADD CONSTRAINT "user_data_export_audits_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "user_data_export_audits_actor_status_created_idx"
  ON "user_data_export_audits"("actor_user_id", "status", "created_at");

CREATE INDEX "user_data_export_audits_status_created_idx"
  ON "user_data_export_audits"("status", "created_at");

