export const DEFAULT_RESEARCH_ALLOWED_TABLES = [
  'data_table_descriptions',
  'teaching_groups',
  'teaching_group_members',
  'users',
  'student_profile',
  'practice_events',
  'ai_interaction_logs'
] as const;

export function getResearchAllowedTables() {
  return (process.env.RESEARCH_AI_ALLOWED_TABLES || DEFAULT_RESEARCH_ALLOWED_TABLES.join(','))
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);
}

export type ResearchTableDescription = {
  tableKey: string;
  displayName: string;
  groupName: string;
  businessMeaning: string;
  dataGrain: string | null;
  keyColumns: unknown;
  relationships: unknown;
  researchUseCases: unknown;
  agentGuidance: string | null;
  sensitivityLevel: string;
};

function listJsonValues(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('; ')
    : '';
}

function buildTableDescriptionSection(descriptions: ResearchTableDescription[]) {
  if (!descriptions.length) return '';
  return `
Database semantic registry from data_table_descriptions:
${descriptions.map((item) => [
  `- ${item.tableKey} (${item.displayName}, ${item.groupName})`,
  `  Meaning: ${item.businessMeaning}`,
  item.dataGrain ? `  Grain: ${item.dataGrain}` : '',
  `  Key columns: ${listJsonValues(item.keyColumns)}`,
  `  Relationships: ${listJsonValues(item.relationships)}`,
  `  Research use cases: ${listJsonValues(item.researchUseCases)}`,
  item.agentGuidance ? `  Agent guidance: ${item.agentGuidance}` : '',
  `  Sensitivity: ${item.sensitivityLevel}`
].filter(Boolean).join('\n')).join('\n')}
`.trim();
}

export function buildResearchDataDictionaryPrompt(allowedTables: string[], descriptions: ResearchTableDescription[] = []) {
  const dynamicSection = buildTableDescriptionSection(
    descriptions.filter((item) => allowedTables.includes(item.tableKey))
  );

  return `
Research data dictionary and business semantics

Allowed tables for this request:
${allowedTables.map((table) => `- ${table}`).join('\n')}

${dynamicSection ? `${dynamicSection}\n` : ''}

Tables and columns:
- data_table_descriptions: table_key, display_name, group_name, business_meaning, data_grain, key_columns, relationships, research_use_cases, agent_guidance, sensitivity_level, is_active
  Meaning: semantic registry for every database table. Use it to understand table meanings and relationships before proposing research topics or writing exploratory queries.
- teaching_groups: id, name, description, color, is_active, created_at, updated_at
  Meaning: teacher-managed teaching groups/classes. The group display name is teaching_groups.name.
- teaching_group_members: group_id, user_id, assigned_by, created_at
  Meaning: membership relation between a teaching group and a student user.
- users: id, username, status, created_at, updated_at
  Meaning: login accounts for students and teachers. Use username only as a fallback display name when student_profile.real_name and student_profile.name are empty.
- student_profile: user_id, name, real_name, nationality, age, gender, hsk_level, major, completed_at
  Meaning: student learning profile. real_name is the preferred teacher-facing student display name. Do not expose student_no, email, or password_hash.
- practice_events: id, user_id, stage_id, session_id, resource_id, event_type, metadata_json, created_at
  Meaning: behavior and research event log. This includes clickstream and learning/practice events.
- ai_interaction_logs: id, user_id, session_id, message_id, stage_id, provider, model, prompt_version, system_prompt, input_messages_json, output_text, output_json, latency_ms, degraded, error_code, error_message, created_at
  Meaning: every server-side AI model call. This is the primary table for analyzing how AI helped learners, what the learner asked, and what the AI returned.

Foreign-key relationships:
- teaching_group_members.group_id = teaching_groups.id
- teaching_group_members.user_id = users.id
- student_profile.user_id = users.id
- practice_events.user_id = users.id
- ai_interaction_logs.user_id = users.id
- ai_interaction_logs.session_id = practice_events.session_id when comparing AI calls with behavior events in the same practice session

Critical column rules:
- teaching_groups has column "id"; it does not have "group_id".
- teaching_groups has column "name"; it does not have "group_name".
- teaching_group_members has columns "group_id" and "user_id".
- practice_events has "event_type" and "metadata_json"; click details are JSON fields in metadata_json.
- ai_interaction_logs uses "prompt_version" to distinguish AI use cases. "coach-v1" means the student explicitly asked the AI coach for help. "v1" means the AI generated the role-play opponent response.

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

AI help and adoption business rules:
- The teacher's main AI-help research questions are about when learners ask the AI coach for help, what they ask, what the AI answers, and whether they copy or reuse AI-provided information.
- For "when users ask AI for help", "AI help", "AI coach", "求助AI", "请求AI", or "追问AI", use ai_interaction_logs where prompt_version = 'coach-v1'. You may also use practice_events.event_type = 'coach_question_asked' for the click/behavior event.
- For role-play AI opponent responses, use ai_interaction_logs where prompt_version = 'v1'. Do not mix this with explicit AI coach help unless the question asks for all AI interactions.
- The learner's question to the AI coach is stored in ai_interaction_logs.input_messages_json->>'question' and also in practice_events.metadata_json->>'question' for coach_question_asked events.
- The AI coach answer is stored in ai_interaction_logs.output_text.
- AI fallback/degraded status is ai_interaction_logs.degraded.
- Opening the AI coach context is logged as practice_events.event_type = 'coach_context_opened'. This shows help-seeking intent before a question is submitted.
- Copying an AI coach answer is logged as practice_events.event_type = 'ai_coach_answer_copied'. The copied content preview is in metadata_json->>'answer_excerpt'; the related learner question is metadata_json->>'question'; answer length is metadata_json->>'answer_length'.
- To analyze copied AI information, query practice_events with event_type = 'ai_coach_answer_copied' and group/list metadata_json->>'answer_excerpt', metadata_json->>'question', user_id, session_id, and created_at.
- To compare AI help with later activity, join ai_interaction_logs and practice_events by user_id/session_id/stage_id and time windows. Use cautious wording because exact causality is not guaranteed.

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
- When listing or grouping by individual students, join student_profile and select COALESCE(NULLIF(student_profile.real_name, ''), NULLIF(student_profile.name, ''), users.username) AS student_name. Do not return raw user_id values as display labels.
- Never query password_hash, email, student_no, or other sensitive fields.
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
- Use the student_name column as the student identifier in answers. Do not write "用户ID" or expose raw UUID/user_id values; say "学生" or "学生姓名" instead.
- For clickstream results, call them "clickstream/click events" and distinguish ui_click from page_view when present.
- For AI-help results, distinguish explicit AI coach help (prompt_version = 'coach-v1') from role-play AI responses (prompt_version = 'v1').
- For copied AI content, summarize copied themes from answer_excerpt/question rather than exposing raw full transcripts unless the user asks for samples.
`.trim();
}
