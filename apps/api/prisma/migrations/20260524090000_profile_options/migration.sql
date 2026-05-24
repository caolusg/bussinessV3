CREATE TABLE "profile_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_options_category_value_unique" ON "profile_options"("category", "value");
CREATE INDEX "profile_options_category_active_sort_idx" ON "profile_options"("category", "is_active", "sort_order");

INSERT INTO "profile_options" ("category", "value", "label", "sort_order", "is_active")
VALUES
  ('major', '汉语言', '汉语言', 10, true),
  ('major', '商务汉语', '商务汉语', 20, true),
  ('major', '汉语言（商务方向）', '汉语言（商务方向）', 30, true),
  ('major', '汉语言商务方向', '汉语言商务方向', 40, true),
  ('major', '国际中文教育', '国际中文教育', 50, true),
  ('major', '语言学', '语言学', 60, true),
  ('major', '商贸方向', '商贸方向', 70, true),
  ('major', '商务', '商务', 80, true),
  ('major', '计算机', '计算机', 90, true)
ON CONFLICT ("category", "value") DO NOTHING;
