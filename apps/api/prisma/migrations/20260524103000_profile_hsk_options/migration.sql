INSERT INTO "profile_options" ("category", "value", "label", "sort_order", "is_active")
VALUES
  ('hsk_level', 'HSK1', 'HSK 1', 10, true),
  ('hsk_level', 'HSK2', 'HSK 2', 20, true),
  ('hsk_level', 'HSK3', 'HSK 3', 30, true),
  ('hsk_level', 'HSK4', 'HSK 4', 40, true),
  ('hsk_level', 'HSK5', 'HSK 5', 50, true),
  ('hsk_level', 'HSK6', 'HSK 6', 60, true),
  ('hsk_level', 'HSK7', 'HSK 7', 70, true),
  ('hsk_level', 'HSK8', 'HSK 8', 80, true),
  ('hsk_level', 'HSK9', 'HSK 9', 90, true)
ON CONFLICT ("category", "value") DO NOTHING;
