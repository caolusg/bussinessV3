CREATE TABLE "role_panel_permissions" (
  "role_id" uuid NOT NULL,
  "panel_key" text NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),

  CONSTRAINT "role_panel_permissions_pkey" PRIMARY KEY ("role_id", "panel_key"),
  CONSTRAINT "role_panel_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "role_panel_permissions_panel_key_idx"
  ON "role_panel_permissions"("panel_key");

INSERT INTO "role_panel_permissions" ("role_id", "panel_key")
SELECT "id", panel_key
FROM "roles"
CROSS JOIN (
  VALUES
    ('users'),
    ('resources'),
    ('groups'),
    ('research'),
    ('click_flow'),
    ('prompt'),
    ('system_data'),
    ('system_admin')
) AS panels(panel_key)
WHERE "roles"."key" = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO "role_panel_permissions" ("role_id", "panel_key")
SELECT "id", 'resources'
FROM "roles"
WHERE "roles"."key" = 'teacher'
ON CONFLICT DO NOTHING;
