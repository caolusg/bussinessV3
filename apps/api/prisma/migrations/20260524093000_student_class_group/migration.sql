ALTER TABLE "student_profile" ADD COLUMN "class_group" TEXT;

UPDATE "student_profile"
SET "class_group" = '其他'
WHERE "class_group" IS NULL;

INSERT INTO "profile_options" ("category", "value", "label", "sort_order", "is_active")
VALUES ('class_group', '其他', '其他', 10, true)
ON CONFLICT ("category", "value") DO NOTHING;
