CREATE OR REPLACE FUNCTION teaching_groups_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS "teaching_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "color" text NOT NULL DEFAULT 'indigo',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "teaching_group_members" (
  "group_id" uuid NOT NULL REFERENCES "teaching_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "assigned_by" uuid REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("group_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "teaching_groups_active_updated_idx"
  ON "teaching_groups" ("is_active", "updated_at");

CREATE INDEX IF NOT EXISTS "teaching_group_members_user_idx"
  ON "teaching_group_members" ("user_id");

DROP TRIGGER IF EXISTS teaching_groups_set_updated_at ON "teaching_groups";
CREATE TRIGGER teaching_groups_set_updated_at
BEFORE UPDATE ON "teaching_groups"
FOR EACH ROW
EXECUTE FUNCTION teaching_groups_set_updated_at();
