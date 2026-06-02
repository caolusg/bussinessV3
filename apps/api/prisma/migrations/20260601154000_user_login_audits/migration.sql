CREATE TABLE "user_login_audits" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "identifier" text NOT NULL DEFAULT '',
  "portal" text NOT NULL,
  "status" text NOT NULL,
  "failure_reason" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_login_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_login_audits_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE INDEX "user_login_audits_user_created_idx"
  ON "user_login_audits"("user_id", "created_at");

CREATE INDEX "user_login_audits_portal_created_idx"
  ON "user_login_audits"("portal", "created_at");

CREATE INDEX "user_login_audits_status_created_idx"
  ON "user_login_audits"("status", "created_at");

