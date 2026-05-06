export const DEFAULT_RESEARCH_ALLOWED_TABLES = [
  'teaching_groups',
  'teaching_group_members',
  'users',
  'student_profile',
  'practice_events'
] as const;

export function getResearchAllowedTables() {
  return (process.env.RESEARCH_AI_ALLOWED_TABLES || DEFAULT_RESEARCH_ALLOWED_TABLES.join(','))
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);
}

export function buildResearchDataDictionaryPrompt(allowedTables: string[]) {
  return `
Research data dictionary and business semantics

Allowed tables for this request:
${allowedTables.map((table) => `- ${table}`).join('\n')}

Tables and columns:
- teaching_groups: id, name, description, color, is_active, created_at, updated_at
  Meaning: teacher-managed teaching groups/classes. The group display name is teaching_groups.name.
- teaching_group_members: group_id, user_id, assigned_by, created_at
  Meaning: membership relation between a teaching group and a student user.
- users: id, username, status, created_at, updated_at
  Meaning: login accounts for students and teachers. Do not expose username unless absolutely necessary.
- student_profile: user_id, nationality, age, gender, hsk_level, major, completed_at
  Meaning: student learning profile. Do not expose real_name, name, student_no, email, or password_hash.
- practice_events: id, user_id, stage_id, session_id, resource_id, event_type, metadata_json, created_at
  Meaning: behavior and research event log. This includes clickstream and learning/practice events.

Foreign-key relationships:
- teaching_group_members.group_id = teaching_groups.id
- teaching_group_members.user_id = users.id
- student_profile.user_id = users.id
- practice_events.user_id = users.id

Critical column rules:
- teaching_groups has column "id"; it does not have "group_id".
- teaching_groups has column "name"; it does not have "group_name".
- teaching_group_members has columns "group_id" and "user_id".
- practice_events has "event_type" and "metadata_json"; click details are JSON fields in metadata_json.

Clickstream business rules:
- Clickstream data is stored in practice_events.
- Clickstream event types are practice_events.event_type IN ('ui_click', 'page_view').
- Clickstream metadata_json may contain page, route, label, target, role, tagName, id, and other UI context.
- "click flow", "clickstream", "click data", "page view", "button click", "click", "dianji", and Chinese terms "\u70b9\u51fb", "\u70b9\u51fb\u6d41", "\u70b9\u51fb\u6570\u636e" usually mean practice_events clickstream.
- Chinese questions containing "\u70b9\u51fb", "\u70b9\u51fb\u6d41", "\u70b9\u51fb\u6570\u636e", or "\u9875\u9762\u6d4f\u89c8" mean clickstream.
- Classify clickstream intent from the current user question first. Do not inherit clickstream filters only because previous context mentioned clickstream.
- For today's clickstream, use practice_events.created_at >= CURRENT_DATE.
- For recent N days, use practice_events.created_at >= CURRENT_DATE - INTERVAL 'N days'.
- For "is there clickstream data today", query practice_events directly and return counts grouped by event_type and date.
- Do not join teaching_group_members for clickstream questions unless the user explicitly asks for teaching-group breakdown.
- Teacher/admin clicks can also be logged in practice_events. A join to teaching_group_members can remove those rows because teachers are usually not group members.

Student activity business rules:
- Student practice activity is broader than clickstream.
- Use practice_events for learning/practice events and count distinct practice_events.user_id for active users.
- Use teaching_group_members only when the user asks for group/class breakdown or student membership scope.
- If grouping by teaching group, join teaching_group_members on practice_events.user_id = teaching_group_members.user_id, then join teaching_groups on group_id = id.
- For teaching-group active student counts/trends, do not filter event_type to ('ui_click', 'page_view') unless the current question explicitly asks for clickstream/click/page-view activity.
- "teaching group active students" means distinct student users from practice_events joined to teaching_group_members, across all relevant practice_events in the requested time window.

SQL generation rules:
- Return only one PostgreSQL SELECT statement.
- Do not return explanations, markdown, comments, or diagnostic SQL.
- Use only the allowed tables and columns listed above.
- Always include LIMIT 200.
- Prefer aggregate summaries for research questions.
- Never query password_hash, email, real_name, name, student_no, or other directly identifying fields.
- If the current user message corrects a previous result, treat it as new evidence and generate a direct verification query.
- The current user question has priority over previous context. Previous context may clarify references, but must not override the current question's metric, time range, grouping, or event_type filters.
`.trim();
}

export function buildResearchAnswerRulesPrompt() {
  return `
Answer rules for research analysis:
- You are a data analyst for a teacher admin dashboard, not a role-play coach.
- Answer in Chinese for a teacher/researcher.
- Use only the SQL result as evidence.
- Do not mention customer intent, superiors, role-play, JOIN mismatch, SQL debugging, or next SQL steps unless the user explicitly asks.
- Do not include markdown code blocks.
- If rows are empty, say no matching records were found for this query scope.
- If rows contain counts, state the counts plainly.
- For clickstream results, call them "clickstream/click events" and distinguish ui_click from page_view when present.
`.trim();
}
