CREATE TABLE "user_data_export_audits" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" uuid,
  "export_type" text NOT NULL,
  "source_panel" text NOT NULL,
  "file_name" text,
  "row_count" integer NOT NULL DEFAULT 0,
  "student_count" integer NOT NULL DEFAULT 0,
  "target_students" jsonb,
  "filters_json" jsonb,
  "metadata_json" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),

  CONSTRAINT "user_data_export_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_data_export_audits_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "user_data_export_audits_actor_created_idx"
  ON "user_data_export_audits"("actor_user_id", "created_at");

CREATE INDEX "user_data_export_audits_type_created_idx"
  ON "user_data_export_audits"("export_type", "created_at");

INSERT INTO "role_panel_permissions" ("role_id", "panel_key")
SELECT "id", 'user_audit'
FROM "roles"
WHERE "roles"."key" = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO "data_table_descriptions" (
  "table_key",
  "display_name",
  "group_name",
  "business_meaning",
  "data_grain",
  "key_columns",
  "relationships",
  "research_use_cases",
  "agent_guidance",
  "sensitivity_level"
) VALUES (
  'user_data_export_audits',
  '用户数据下载审计',
  '用户与权限',
  '记录后台用户导出学生数据的行为，用于追踪谁在什么时间下载了哪些学生数据。',
  '一行代表一次数据导出动作。',
  '["actor_user_id", "export_type", "source_panel", "file_name", "student_count", "target_students", "created_at"]'::jsonb,
  '[{"from":"user_data_export_audits.actor_user_id","to":"users.id","type":"many_to_one"}]'::jsonb,
  '["审计学生数据导出行为", "追踪敏感数据下载范围和操作者"]'::jsonb,
  '这是审计表，可用于安全治理；target_students 内可能包含学生显示名、学号或匿名码，展示时应控制在管理员/审计权限范围。',
  'restricted'
)
ON CONFLICT ("table_key") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "group_name" = EXCLUDED."group_name",
  "business_meaning" = EXCLUDED."business_meaning",
  "data_grain" = EXCLUDED."data_grain",
  "key_columns" = EXCLUDED."key_columns",
  "relationships" = EXCLUDED."relationships",
  "research_use_cases" = EXCLUDED."research_use_cases",
  "agent_guidance" = EXCLUDED."agent_guidance",
  "sensitivity_level" = EXCLUDED."sensitivity_level",
  "is_active" = true,
  "updated_at" = now();
