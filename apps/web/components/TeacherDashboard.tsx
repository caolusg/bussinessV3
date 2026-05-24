import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Code2,
  Copy,
  Database,
  Download,
  Edit3,
  GraduationCap,
  Group,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import { apiRequest } from '../utils/apiFetch';
import TeachingGroupManager from './TeachingGroupManager';
import TeachingResourceManager from './TeachingResourceManager';

interface TeacherDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onPasswordChange: (payload: PasswordChangePayload) => Promise<void>;
}

type PasswordChangePayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type TeacherTab = 'USERS' | 'RESOURCES' | 'GROUPS' | 'STUDENT_RESEARCH' | 'RECORDS' | 'CLICK_FLOW' | 'PROMPT' | 'SYSTEM_DATA' | 'ACCOUNT';
type PanelPermissionKey = 'users' | 'resources' | 'groups' | 'student_research' | 'research_ai' | 'click_flow' | 'prompt' | 'system_data' | 'system_admin';

type ProfileOption = {
  id: string;
  category: 'hsk_level' | 'major';
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type ProfileOptionForm = {
  id?: string;
  category: 'hsk_level' | 'major';
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type AdminTableMeta = {
  key: string;
  label: string;
  group: string;
  idField: string | null;
  searchableFields: string[];
  summaryColumns: string[];
  statusFields: string[];
  dateFields: string[];
};

type AdminTableListResponse = {
  table: AdminTableMeta & {
    statusValues?: Record<string, unknown[]>;
  };
  rows: Record<string, unknown>[];
  columns: string[];
  total: number;
  page: number;
  pageSize: number;
};

type AdminOverview = {
  generatedAt: string;
  ai: {
    enabled: boolean;
    provider: string;
    baseURL: string | null;
    model: string | null;
    hasKey: boolean;
    proxyConfigured: boolean;
  };
  cards: Array<{
    key: string;
    label: string;
    value: number;
    detail: string;
  }>;
  recentAiErrors: Array<Record<string, unknown>>;
};

type ResearchOverview = {
  generatedAt: string;
  dateRange: 'today' | '7d' | '30d' | 'all';
  metrics: {
    studentCount: number;
    sessionCount: number;
    messageCount: number;
    studentMessageCount: number;
    aiCallCount: number;
    degradedAiCallCount: number;
    degradedRate: number;
    analysisCount: number;
    practiceEventCount: number;
  };
  stageBreakdown: Array<{
    stageId: string;
    key: string;
    titleZh: string;
    titleEn?: string | null;
    sessionCount: number;
    analysisCount: number;
    aiCallCount: number;
    degradedAiCallCount: number;
    degradedRate: number;
    averageScore: number | null;
  }>;
  researchIdeas: Array<{
    title: string;
    question: string;
    data: string;
    method: string;
  }>;
  datasetPreview: Array<{
    messageId: string;
    anonymousUserCode: string;
    stageKey: string;
    stageTitle: string;
    turnIndex: number;
    studentMessage: string;
    score: number | null;
    hskLevel?: string | null;
    nationality?: string | null;
    major?: string | null;
    createdAt: string;
  }>;
};

type ResearchStudentRow = {
  user: Record<string, unknown> & {
    id: string;
    anonymousUserCode: string;
    username: string;
    email?: string | null;
    status: string;
    studentProfile?: Record<string, unknown> | null;
    studentAuth?: Record<string, unknown> | null;
    groups?: Array<Record<string, unknown>>;
  };
  stats: {
    sessionCount: number;
    messageCount: number;
    studentMessageCount: number;
    aiCallCount: number;
    degradedAiCallCount: number;
    practiceEventCount: number;
  };
  recentMessages: Array<Record<string, unknown> & {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  recentAiLogs: Array<Record<string, unknown> & {
    id: string;
    provider?: string | null;
    model?: string | null;
    outputText?: string | null;
    degraded?: boolean;
    createdAt: string;
  }>;
  recentEvents: Array<Record<string, unknown>>;
  lastActivityAt?: string | null;
};

type ResearchStudentDirectory = {
  generatedAt: string;
  dateRange: 'today' | '7d' | '30d' | 'all';
  search: string;
  total: number;
  page: number;
  pageSize: number;
  rows: ResearchStudentRow[];
};

type ResearchStudentActivity = {
  generatedAt: string;
  dateRange: 'today' | '7d' | '30d' | 'all';
  user: ResearchStudentRow['user'];
  stats: ResearchStudentRow['stats'];
  sessions: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown> & {
    id: string;
    sessionId: string;
    role: string;
    content: string;
    turnIndex: number;
    createdAt: string;
  }>;
  aiLogs: ResearchStudentRow['recentAiLogs'];
  practiceEvents: Array<Record<string, unknown>>;
};

type SessionSummary = {
  session: Record<string, unknown> & {
    user?: Record<string, unknown> | null;
    businessStage?: Record<string, unknown> | null;
    task?: Record<string, unknown> | null;
    scenario?: Record<string, unknown> | null;
  };
  stats: {
    messageCount: number;
    studentMessageCount: number;
    opponentMessageCount: number;
    aiCallCount: number;
    degradedAiCallCount: number;
    practiceEventCount: number;
    analysisResultCount: number;
  };
  messages: Array<Record<string, unknown> & {
    id: string;
    role: string;
    content: string;
    turnIndex: number;
    createdAt: string;
  }>;
  aiLogs: Array<Record<string, unknown> & {
    id: string;
    provider?: string | null;
    model?: string | null;
    degraded?: boolean;
    latencyMs?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    outputText?: string | null;
    createdAt: string;
  }>;
  practiceEvents: Array<Record<string, unknown>>;
  analysisResults: Array<Record<string, unknown>>;
};

type StudentSummary = {
  user: Record<string, unknown> & {
    roles?: string[];
    studentProfile?: Record<string, unknown> | null;
    studentAuth?: Record<string, unknown> | null;
  };
  stats: {
    sessionCount: number;
    messageCount: number;
    practiceEventCount: number;
    aiCallCount: number;
    degradedAiCallCount: number;
    profileCompleted: boolean;
  };
  recentSessions: Array<Record<string, unknown>>;
  recentMessages: Array<Record<string, unknown> & {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  recentPracticeEvents: Array<Record<string, unknown>>;
  recentAiLogs: Array<Record<string, unknown> & {
    id: string;
    provider?: string | null;
    model?: string | null;
    degraded?: boolean;
    latencyMs?: number | null;
    outputText?: string | null;
    createdAt: string;
  }>;
};

type ClickFlowSummary = {
  generatedAt: string;
  total: number;
  uiClickCount: number;
  pageViewCount: number;
  activeStudentCount: number;
  eventBreakdown: Array<{ eventType: string; count: number }>;
  stageBreakdown: Array<{
    stageId?: string | null;
    key?: string | null;
    titleZh?: string | null;
    sortOrder?: number | null;
    count: number;
  }>;
  students: Array<{
    userId?: string | null;
    username?: string | null;
    displayName?: string | null;
    eventCount: number;
  }>;
  rows: Array<Record<string, unknown> & {
    id: string;
    eventType: string;
    sessionId?: string | null;
    stageId?: string | null;
    resourceId?: string | null;
    metadataJson?: unknown;
    stage?: Record<string, unknown> | null;
    resource?: Record<string, unknown> | null;
    createdAt: string;
  }>;
};

type ResearchAiResult = {
  question: string;
  sql: string;
  rowCount: number;
  durationMs: number;
  rows: Record<string, unknown>[];
  answer: string;
  chartSuggestion?: 'line' | 'bar' | 'table';
  followupPrompts?: string[];
  sqlRisk?: { level: 'low' | 'medium' | 'high'; items: string[] };
  modelDegraded?: boolean;
};

type ResearchTopic = {
  title: string;
  researchQuestion: string;
  tables: string[];
  variables: string[];
  method: string;
  feasibilityScore: number;
  sampleEvidence: string;
  limitations: string[];
  nextSql: string;
};

type ResearchTopicDiscovery = {
  overview: string;
  topics: ResearchTopic[];
  scans: Array<{
    key: string;
    label: string;
    sql: string;
    rows: Record<string, unknown>[];
  }>;
  durationMs: number;
  modelDegraded?: boolean;
};

type ResearchAiHistoryItem = {
  ts: string;
  question: string;
  sql: string;
  rowCount: number;
};
type ResearchAiContextItem = {
  question: string;
  answer: string;
};

type ResearchAiConversationTurn = {
  id: string;
  question: string;
  result: ResearchAiResult;
};

const sanitizeResearchAiContext = (items: ResearchAiContextItem[]) =>
  items
    .map((item) => ({
      question: String(item.question ?? '').trim().slice(0, 1000),
      answer: String(item.answer ?? '').trim().slice(0, 4000)
    }))
    .filter((item) => item.question && item.answer)
    .slice(-6);

type AiLogSummary = {
  log: Record<string, unknown> & {
    id: string;
    provider?: string | null;
    model?: string | null;
    promptVersion?: string | null;
    systemPrompt?: string | null;
    inputMessagesJson?: unknown;
    outputText?: string | null;
    outputJson?: unknown;
    latencyMs?: number | null;
    degraded?: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
    createdAt: string;
    user?: Record<string, unknown> | null;
    session?: Record<string, unknown> | null;
    message?: Record<string, unknown> | null;
    stage?: Record<string, unknown> | null;
  };
  relatedMessages: Array<Record<string, unknown> & {
    id: string;
    role: string;
    content: string;
    turnIndex: number;
    createdAt: string;
  }>;
  links: Record<string, string | null>;
};

type PromptStage = {
  id: string;
  key: string;
  sortOrder: number;
  titleZh: string;
  titleEn?: string | null;
  aiScenarios: PromptScenario[];
};

type PromptScenario = {
  id: string;
  stageId: string;
  stage: number;
  stageKey: string;
  stageTitle: string;
  name: string;
  opponentName?: string | null;
  opponentRole?: string | null;
  systemPrompt: string;
  difficulty: string;
  promptVersion: string;
  isDefault: boolean;
  isActive: boolean;
  type: string;
  updatedAt?: string;
};

type ScenarioManagerResponse = {
  stages: Array<Omit<PromptStage, 'aiScenarios'> & {
    aiScenarios: Array<Omit<PromptScenario, 'stage' | 'stageKey' | 'stageTitle' | 'type'>>;
  }>;
  totals: {
    stageCount: number;
    scenarioCount: number;
    activeScenarioCount: number;
  };
};

type ScenarioFormState = {
  stageId: string;
  name: string;
  opponentName: string;
  opponentRole: string;
  systemPrompt: string;
  difficulty: string;
  promptVersion: string;
  isDefault: boolean;
  isActive: boolean;
};

type ManagedRoleKey = string;

type PanelPermission = {
  key: PanelPermissionKey;
  label: string;
  description: string;
};

type ManagedRole = {
  id: string;
  key: ManagedRoleKey;
  name: string;
  isSystem: boolean;
  permissions: PanelPermissionKey[];
};

type ManagedUser = {
  id: string;
  username: string;
  email?: string | null;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'DISABLED';
  roles: ManagedRoleKey[];
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  studentAuth?: Record<string, unknown> | null;
  studentProfile?: Record<string, unknown> | null;
};

type ManagedTeachingGroup = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  isActive: boolean;
  memberCount: number;
};

type UserManagerResponse = {
  users: ManagedUser[];
  roles: ManagedRole[];
  panels: PanelPermission[];
  groups: ManagedTeachingGroup[];
  currentUserId: string | null;
  totals: {
    userCount: number;
    adminCount: number;
    teacherCount: number;
    studentCount: number;
  };
};

type ManagedUserForm = {
  username: string;
  email: string;
  password: string;
  status: ManagedUser['status'];
  roleKeys: ManagedRoleKey[];
};

type ManagedRoleForm = {
  key: string;
  name: string;
  permissions: PanelPermissionKey[];
};

const PAGE_SIZE = 25;
const RESEARCH_STUDENT_PAGE_SIZE = 25;
const emptyProfileOptionForm: ProfileOptionForm = {
  category: 'major',
  value: '',
  label: '',
  sortOrder: 0,
  isActive: true
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatCell = (value: unknown) => {
  const text = formatValue(value);
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
};

const getManagedUserSearchText = (user: ManagedUser) => {
  const profile = user.studentProfile ?? {};
  return [
    user.username,
    user.email,
    profile.realName,
    profile.name
  ].map(formatValue).join(' ').toLowerCase();
};

const buildResearchChartData = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  const labelCol = columns[0];
  const valueCol = columns.find((col) => rows.some((row) => typeof row[col] === 'number'));
  if (!labelCol || !valueCol) return [];
  return rows.slice(0, 12)
    .map((row) => ({ label: formatCell(row[labelCol]), value: Number(row[valueCol] ?? 0) }))
    .filter((item) => Number.isFinite(item.value));
};



const AI_QUERY_TEMPLATES = [
  '最近30天学生求助AI教练的次数趋势（按天）',
  '统计学生最常向AI教练求助的问题类型',
  '列出最近30天学生复制了哪些AI教练回复摘要',
  '近30天按分组统计活跃学生数，并按日期升序',
  '近7天学生练习事件数量趋势（按天）'
];

const STAGE_LABELS: Record<string, string> = {
  acquisition: '获客',
  quotation: '报价',
  negotiation: '磋商',
  contract: '合同',
  preparation: '备货',
  customs: '报关',
  settlement: '结算',
  after_sales: '售后'
};

const PAGE_LABELS: Record<string, string> = {
  teacher: '教师后台',
  student: '学生端',
  simulation: '业务练习页',
  practice: '业务练习页',
  resources: '学习资源页',
  groups: '小组讨论页',
  login: '登录页'
};

const PRACTICE_EVENT_LABELS: Record<string, string> = {
  coach_context_opened: '打开 AI 教练面板',
  coach_question_asked: '向 AI 教练提问',
  ai_coach_answer_copied: '复制 AI 教练回复',
  student_message_sent: '发送学生消息',
  message_sent: '发送消息',
  ai_reply_received: '收到 AI 客户回复',
  stage_opened: '打开业务阶段',
  simulation_started: '开始练习',
  simulation_exited: '离开练习',
  practice_session_opened: '进入业务练习',
  practice_session_restarted: '重新开始练习',
  practice_session_ended: '结束练习',
  resource_list_viewed: '查看资源列表',
  resource_viewed: '查看学习资源',
  discussion_viewed: '进入小组讨论',
  page_view: '页面浏览',
  ui_click: '界面点击'
};

const asRecord = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {});

const formatStageName = (value: unknown) => {
  const key = formatValue(value);
  return STAGE_LABELS[key] ? `${STAGE_LABELS[key]}阶段` : key;
};

const formatPageName = (value: unknown) => {
  const key = formatValue(value);
  return PAGE_LABELS[key] ?? key;
};

const formatEventTypeLabel = (value: unknown) => {
  const key = formatValue(value);
  return PRACTICE_EVENT_LABELS[key] ?? key;
};

const getPracticeEventMeta = (event: Record<string, unknown>) => {
  const key = formatValue(event.eventType);
  const metadata = asRecord(event.metadataJson);
  const stage = asRecord(event.stage);
  const resource = asRecord(event.resource);
  const stageName = formatValue(stage.titleZh) || formatStageName(metadata.stage);
  const pageName = formatPageName(metadata.page);
  const route = formatValue(metadata.route);
  const label = formatValue(metadata.label);
  const target = formatValue(metadata.target);
  const term = formatValue(resource.term ?? metadata.term);
  const resourceType = formatValue(resource.type ?? metadata.resourceType);

  const labelText = formatEventTypeLabel(key) || '未知事件';
  let description = '';

  switch (key) {
    case 'page_view':
      description = pageName
        ? `学生打开了「${pageName}」${route ? `，路径：${route}` : ''}。`
        : '学生打开了页面，但这条记录没有保存具体页面名称。';
      break;
    case 'ui_click':
      description = `学生在「${pageName || '当前页面'}」点击了${label ? `「${label}」` : '一个控件'}${target ? `（${target}）` : ''}。`;
      break;
    case 'practice_session_opened':
      description = `学生进入了${stageName || '某个业务阶段'}的练习。`;
      break;
    case 'practice_session_restarted':
      description = `学生重新开始了${stageName || '当前阶段'}练习${formatValue(metadata.attemptNo) ? `，第 ${formatValue(metadata.attemptNo)} 次尝试` : ''}。`;
      break;
    case 'practice_session_ended':
      description = `学生结束了${stageName || '当前阶段'}练习。`;
      break;
    case 'coach_context_opened':
      description = `学生在${stageName || '当前练习'}中打开 AI 教练面板，查看上下文和求助入口。`;
      break;
    case 'coach_question_asked':
      description = `学生向 AI 教练提问：${formatCell(metadata.question) || '问题内容未记录'}。`;
      break;
    case 'student_message_sent':
      description = `学生在${stageName || '业务对话'}中发送消息，字数 ${formatValue(metadata.characterCount) || '未记录'}。`;
      break;
    case 'resource_list_viewed':
      description = `学生查看了${stageName || '当前阶段'}的学习资源列表。`;
      break;
    case 'resource_viewed':
      description = `学生查看了学习资源${term ? `「${term}」` : ''}${resourceType ? `（${resourceType}）` : ''}。`;
      break;
    default:
      description = `记录到「${labelText}」事件${stageName ? `，关联阶段：${stageName}` : ''}${pageName ? `，页面：${pageName}` : ''}。`;
  }

  return { label: labelText, description };
};

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const columns = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));

  const esc = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = columns.map(esc).join(',');
  const body = rows.map((row) => columns.map((col) => esc(row[col])).join(',')).join('\n');
  return `\uFEFF${header}\n${body}`;
};

const DATE_RANGES = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' }
] as const;

const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '启用' },
  { value: 'PENDING_VERIFICATION', label: '待验证' },
  { value: 'DISABLED', label: '停用' }
] as const;

const ALL_PANEL_KEYS: PanelPermissionKey[] = ['users', 'resources', 'groups', 'student_research', 'research_ai', 'click_flow', 'prompt', 'system_data', 'system_admin'];

const FALLBACK_PANELS: PanelPermission[] = [
  { key: 'users', label: '用户管理', description: '创建用户、分配角色、重置密码' },
  { key: 'resources', label: '教学资源管理', description: '维护阶段词汇、句式和知识资源' },
  { key: 'groups', label: '分组管理', description: '管理教学分组和学生成员' },
  { key: 'student_research', label: '学生数据研究', description: '查看学生聊天记录、AI 调用和行为事件' },
  { key: 'research_ai', label: '自然语言数据分析', description: '使用自然语言查询研究数据' },
  { key: 'click_flow', label: '点击流分区', description: '查看点击流和页面访问记录' },
  { key: 'prompt', label: '提示词工程管理', description: '管理 AI 场景提示词模板' },
  { key: 'system_data', label: '系统数据', description: '查看底层数据表、会话和 AI 调用记录' },
  { key: 'system_admin', label: '系统管理', description: '维护运行配置、AI 设置和系统级参数' }
];

const TAB_PERMISSIONS: Partial<Record<TeacherTab, PanelPermissionKey>> = {
  USERS: 'users',
  RESOURCES: 'resources',
  GROUPS: 'groups',
  STUDENT_RESEARCH: 'student_research',
  RECORDS: 'research_ai',
  CLICK_FLOW: 'click_flow',
  PROMPT: 'prompt',
  SYSTEM_DATA: 'system_data'
};

const NAV_ITEMS: Array<{ tab: TeacherTab; label: string; mobileLabel: string; icon: React.ReactNode; permission?: PanelPermissionKey }> = [
  { tab: 'USERS', label: '用户管理', mobileLabel: '用户', icon: <ShieldCheck size={18} />, permission: 'users' },
  { tab: 'RESOURCES', label: '教学资源管理', mobileLabel: '资源', icon: <BookOpen size={18} />, permission: 'resources' },
  { tab: 'GROUPS', label: '分组管理', mobileLabel: '分组', icon: <Group size={18} />, permission: 'groups' },
  { tab: 'STUDENT_RESEARCH', label: '学生数据研究', mobileLabel: '学生数据', icon: <Users size={18} />, permission: 'student_research' },
  { tab: 'RECORDS', label: '自然语言数据分析', mobileLabel: 'AI 分析', icon: <BarChart3 size={18} />, permission: 'research_ai' },
  { tab: 'CLICK_FLOW', label: '点击流分区', mobileLabel: '点击流', icon: <MousePointerClick size={18} />, permission: 'click_flow' },
  { tab: 'PROMPT', label: '提示词工程管理', mobileLabel: 'Prompt', icon: <Code2 size={18} />, permission: 'prompt' },
  { tab: 'SYSTEM_DATA', label: '系统数据', mobileLabel: '数据', icon: <Database size={18} />, permission: 'system_data' },
  { tab: 'ACCOUNT', label: '账户设置', mobileLabel: '账户', icon: <Users size={18} /> }
];

const PAGE_TITLES: Record<TeacherTab, string> = {
  USERS: '用户管理',
  RESOURCES: '教学资源管理',
  GROUPS: '分组管理',
  STUDENT_RESEARCH: '学生数据研究',
  RECORDS: '自然语言数据分析',
  CLICK_FLOW: '点击流分区',
  PROMPT: '提示词工程管理',
  SYSTEM_DATA: '系统数据查看',
  ACCOUNT: '账户设置'
};

const getRoleLabelFallback = (role: string) => {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === 'admin') return '系统管理员';
  if (normalizedRole === 'teacher') return '教师';
  if (normalizedRole === 'student') return '学生';
  return role;
};

const formatCurrentUserRoles = (roles?: string[]) => {
  if (!roles?.length) return '未分配角色';
  return roles.map(getRoleLabelFallback).join(' / ');
};

const formatHeaderUserLabel = (user: UserProfile) => {
  const displayName = user.realName?.trim() || user.username?.trim() || '';
  return getRoleLabelFallback(displayName || user.role || '用户');
};

const getInitialTeacherTab = (user: UserProfile): TeacherTab => {
  if (user.roles?.includes('admin')) return 'USERS';
  const panelPermissions = user.panelPermissions ?? [];
  const item = NAV_ITEMS.find((navItem) => !navItem.permission || panelPermissions.includes(navItem.permission));
  return item?.tab ?? 'ACCOUNT';
};

const defaultScenarioForm: ScenarioFormState = {
  stageId: '',
  name: '',
  opponentName: '郑远航',
  opponentRole: '采购总监',
  systemPrompt: '',
  difficulty: 'standard',
  promptVersion: 'v1',
  isDefault: true,
  isActive: true
};

const flattenPromptStages = (stages: ScenarioManagerResponse['stages']): PromptScenario[] =>
  stages.flatMap((stage) =>
    stage.aiScenarios.map((scenario) => ({
      ...scenario,
      stage: stage.sortOrder,
      stageKey: stage.key,
      stageTitle: `${stage.titleZh}${stage.titleEn ? ` (${stage.titleEn})` : ''}`,
      type: scenario.isDefault ? 'Built-in' : 'Custom'
    }))
  );

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout, onPasswordChange }) => {
  const isAdmin = Boolean(user.roles?.includes('admin'));
  const currentRoleText = formatCurrentUserRoles(user.roles);
  const headerUserLabel = formatHeaderUserLabel(user);
  const [activeTab, setActiveTab] = useState<TeacherTab>(() => getInitialTeacherTab(user));
  const [userManager, setUserManager] = useState<UserManagerResponse | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userManagerError, setUserManagerError] = useState('');
  const [userManagerMessage, setUserManagerMessage] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | ManagedUser['status']>('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState<ManagedUserForm>({
    username: '',
    email: '',
    password: '',
    status: 'ACTIVE',
    roleKeys: ['teacher']
  });
  const [newRoleForm, setNewRoleForm] = useState<ManagedRoleForm>({
    key: '',
    name: '',
    permissions: ['resources']
  });
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [profileOptionForm, setProfileOptionForm] = useState<ProfileOptionForm>(emptyProfileOptionForm);
  const [savingProfileOption, setSavingProfileOption] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [scenarioError, setScenarioError] = useState('');
  const [scenarioStages, setScenarioStages] = useState<PromptStage[]>([]);
  const [scenarioForm, setScenarioForm] = useState<ScenarioFormState>(defaultScenarioForm);
  const [accountPasswordForm, setAccountPasswordForm] = useState<PasswordChangePayload>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [changingAccountPassword, setChangingAccountPassword] = useState(false);

  const [adminTables, setAdminTables] = useState<AdminTableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState<AdminTableListResponse | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [researchOverview, setResearchOverview] = useState<ResearchOverview | null>(null);
  const [researchStudents, setResearchStudents] = useState<ResearchStudentDirectory | null>(null);
  const [selectedResearchStudentId, setSelectedResearchStudentId] = useState('');
  const [selectedResearchStudentIds, setSelectedResearchStudentIds] = useState<string[]>([]);
  const [researchStudentActivity, setResearchStudentActivity] = useState<ResearchStudentActivity | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [aiLogSummary, setAiLogSummary] = useState<AiLogSummary | null>(null);
  const [clickFlowSummary, setClickFlowSummary] = useState<ClickFlowSummary | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusField, setStatusField] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [dateField, setDateField] = useState('');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]['value']>('all');
  const [researchDateRange, setResearchDateRange] = useState<(typeof DATE_RANGES)[number]['value']>('30d');
  const [researchStudentPage, setResearchStudentPage] = useState(1);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isLoadingResearchStudents, setIsLoadingResearchStudents] = useState(false);
  const [isLoadingResearchStudentActivity, setIsLoadingResearchStudentActivity] = useState(false);
  const [isDownloadingResearchStudents, setIsDownloadingResearchStudents] = useState(false);
  const [isLoadingSessionSummary, setIsLoadingSessionSummary] = useState(false);
  const [isLoadingStudentSummary, setIsLoadingStudentSummary] = useState(false);
  const [isLoadingAiLogSummary, setIsLoadingAiLogSummary] = useState(false);
  const [isLoadingClickFlow, setIsLoadingClickFlow] = useState(false);
  const [rowsRefreshKey, setRowsRefreshKey] = useState(0);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  const [researchRefreshKey, setResearchRefreshKey] = useState(0);
  const [adminError, setAdminError] = useState('');
  const [clickFlowDateRange, setClickFlowDateRange] = useState<(typeof DATE_RANGES)[number]['value']>('7d');
  const [clickFlowEventType, setClickFlowEventType] = useState<'all' | 'ui_click' | 'page_view'>('all');
  const [clickFlowStudentId, setClickFlowStudentId] = useState('all');
  const [researchStudentSearchDraft, setResearchStudentSearchDraft] = useState('');
  const [researchStudentSearch, setResearchStudentSearch] = useState('');

  const [researchAiQuestion, setResearchAiQuestion] = useState('');
  const [researchAiLoading, setResearchAiLoading] = useState(false);
  const [researchAiError, setResearchAiError] = useState('');
  const [researchAiResult, setResearchAiResult] = useState<ResearchAiResult | null>(null);
  const [researchAiPage, setResearchAiPage] = useState(1);
  const [researchAiSortColumn, setResearchAiSortColumn] = useState('');
  const [researchAiSortDirection, setResearchAiSortDirection] = useState<'asc' | 'desc'>('asc');
  const [researchAiFilterText, setResearchAiFilterText] = useState('');
  const [researchAiHistory, setResearchAiHistory] = useState<ResearchAiHistoryItem[]>([]);
  const [researchAiContext, setResearchAiContext] = useState<ResearchAiContextItem[]>([]);
  const [researchAiTurns, setResearchAiTurns] = useState<ResearchAiConversationTurn[]>([]);
  const [researchAiPendingQuestion, setResearchAiPendingQuestion] = useState('');
  const [researchAiFeedback, setResearchAiFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [topicDiscovery, setTopicDiscovery] = useState<ResearchTopicDiscovery | null>(null);
  const [topicDiscoveryLoading, setTopicDiscoveryLoading] = useState(false);
  const [topicDiscoveryError, setTopicDiscoveryError] = useState('');
  const researchAiScrollRef = useRef<HTMLDivElement | null>(null);

  const [legacyScenarios] = useState([
    { id: 1, name: '1. 获客阶段：商务礼仪与名片交换', stage: 1, type: 'Built-in', active: true, prompt: '你是一个严格的采购经理...' },
    { id: 2, name: '2. 报价阶段：术语 FOB/CIF 详解', stage: 2, type: 'Built-in', active: true, prompt: '重点考察 FOB 术语理解...' },
    { id: 3, name: '3. 磋商阶段：价格异议处理策略', stage: 3, type: 'Built-in', active: true, prompt: '针对价格分歧进行极限施压...' },
    { id: 4, name: '4. 合同阶段：法律术语与风险规避', stage: 4, type: 'Built-in', active: true, prompt: '法律严密性审核...' },
    { id: 5, name: '5. 备货阶段：生产进度与质量监控', stage: 5, type: 'Draft', active: false, prompt: '' }
  ]);
  const [scenarios, setScenarios] = useState<PromptScenario[]>([]);

  const canAccessPanel = (panelKey: PanelPermissionKey) =>
    isAdmin || Boolean(user.panelPermissions?.includes(panelKey));

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.permission || canAccessPanel(item.permission)),
    [isAdmin, user.panelPermissions]
  );

  const availableRoles = userManager?.roles ?? [];
  const availablePanels = userManager?.panels ?? [];

  const getSelectedManagedRoleKey = (roleKeys: ManagedRoleKey[]) => {
    if (roleKeys.includes('admin')) return 'admin';
    return roleKeys[0] ?? '';
  };

  const tableGroups = useMemo(() => {
    return adminTables.reduce<Record<string, AdminTableMeta[]>>((acc, table) => {
      acc[table.group] = acc[table.group] ?? [];
      acc[table.group].push(table);
      return acc;
    }, {});
  }, [adminTables]);

  const visibleColumns = useMemo(() => {
    if (!tableData) return [];
    const available = tableData.columns.length > 0
      ? tableData.columns
      : Array.from(new Set(tableData.rows.flatMap((row) => Object.keys(row))));
    const preferred = tableData.table.summaryColumns.filter((column) => available.includes(column));
    const columns = preferred.length > 0 ? preferred : available;
    return columns.slice(0, 8);
  }, [tableData]);

  const totalPages = tableData ? Math.max(1, Math.ceil(tableData.total / tableData.pageSize)) : 1;
  const currentScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);

  const loadUserManager = async () => {
    if (!canAccessPanel('users')) return;
    setIsLoadingUsers(true);
    setUserManagerError('');
    try {
      const data = await apiRequest<UserManagerResponse>('/api/admin/users/manager');
      setUserManager(data);
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '用户管理数据加载失败');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadProfileOptions = async () => {
    if (!canAccessPanel('users')) return;
    try {
      const data = await apiRequest<{ options: ProfileOption[] }>('/api/admin/profile-options');
      setProfileOptions(data.options);
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '档案选项加载失败');
    }
  };

  const loadScenarios = async () => {
    setIsLoadingScenarios(true);
    setScenarioError('');
    try {
      const data = await apiRequest<ScenarioManagerResponse>('/api/admin/scenarios/manager');
      setScenarioStages(data.stages.map((stage) => ({
        ...stage,
        aiScenarios: stage.aiScenarios.map((scenario) => ({
          ...scenario,
          stage: stage.sortOrder,
          stageKey: stage.key,
          stageTitle: `${stage.titleZh}${stage.titleEn ? ` (${stage.titleEn})` : ''}`,
          type: scenario.isDefault ? 'Built-in' : 'Custom'
        }))
      })));
      setScenarios(flattenPromptStages(data.stages));
    } catch (error) {
      setScenarioError(error instanceof Error ? error.message : '提示词模板加载失败');
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'USERS') return;
    void loadUserManager();
    void loadProfileOptions();
  }, [activeTab, isAdmin, user.panelPermissions]);

  useEffect(() => {
    if (activeTab !== 'PROMPT' || !canAccessPanel('prompt')) return;
    void loadScenarios();
  }, [activeTab, isAdmin, user.panelPermissions]);

  useEffect(() => {
    if (visibleNavItems.some((item) => item.tab === activeTab)) return;
    setActiveTab(visibleNavItems[0]?.tab ?? 'ACCOUNT');
  }, [activeTab, visibleNavItems]);

  useEffect(() => {
    const permission = TAB_PERMISSIONS[activeTab];
    if (!permission || canAccessPanel(permission)) return;
    setActiveTab(visibleNavItems[0]?.tab ?? 'ACCOUNT');
  }, [activeTab, isAdmin, user.panelPermissions, visibleNavItems]);

  useEffect(() => {
    if (newUserForm.roleKeys.length > 0 || availableRoles.length === 0) return;
    const defaultRole = availableRoles.find((role) => role.key === 'teacher') ?? availableRoles[0];
    if (defaultRole) {
      setNewUserForm((current) => ({ ...current, roleKeys: [defaultRole.key] }));
    }
  }, [availableRoles, newUserForm.roleKeys.length]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !canAccessPanel('system_data') || adminTables.length > 0) return;

    let ignore = false;
    setIsLoadingTables(true);
    setAdminError('');

    apiRequest<{ tables: AdminTableMeta[] }>('/api/admin/tables')
      .then((data) => {
        if (ignore) return;
        setAdminTables(data.tables);
        if (!selectedTable && data.tables[0]) {
          setSelectedTable(data.tables[0].key);
        }
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '系统数据加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingTables(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, isAdmin, user.panelPermissions, adminTables.length, selectedTable]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !canAccessPanel('system_data')) return;

    let ignore = false;
    setIsLoadingOverview(true);

    apiRequest<AdminOverview>('/api/admin/overview')
      .then((data) => {
        if (!ignore) setOverview(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '系统总览加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingOverview(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, isAdmin, user.panelPermissions, overviewRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'STUDENT_RESEARCH') return;

    let ignore = false;
    setIsLoadingResearch(true);
    setAdminError('');

    apiRequest<ResearchOverview>(`/api/admin/research/overview?dateRange=${researchDateRange}`)
      .then((data) => {
        if (!ignore) setResearchOverview(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '研究数据加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingResearch(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, researchDateRange, researchRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'STUDENT_RESEARCH') return;

    let ignore = false;
    setIsLoadingResearchStudents(true);
    setAdminError('');

    const params = new URLSearchParams({
      dateRange: researchDateRange,
      search: researchStudentSearch,
      page: String(researchStudentPage),
      pageSize: String(RESEARCH_STUDENT_PAGE_SIZE)
    });

    apiRequest<ResearchStudentDirectory>(`/api/admin/research/students?${params.toString()}`)
      .then((data) => {
        if (ignore) return;
        setResearchStudents(data);
        setSelectedResearchStudentId((current) =>
          data.rows.some((row) => row.user.id === current) ? current : data.rows[0]?.user.id || ''
        );
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '学生研究数据加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingResearchStudents(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, researchDateRange, researchRefreshKey, researchStudentSearch, researchStudentPage]);

  useEffect(() => {
    if (activeTab !== 'STUDENT_RESEARCH') return;
    const timer = window.setTimeout(() => {
      setResearchStudentSearch(researchStudentSearchDraft.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeTab, researchStudentSearchDraft]);

  useEffect(() => {
    setResearchStudentPage(1);
  }, [researchDateRange, researchStudentSearch]);

  useEffect(() => {
    if (activeTab !== 'STUDENT_RESEARCH' || !selectedResearchStudentId) {
      setResearchStudentActivity(null);
      return;
    }

    let ignore = false;
    setIsLoadingResearchStudentActivity(true);
    setAdminError('');

    apiRequest<ResearchStudentActivity>(
      `/api/admin/research/students/${selectedResearchStudentId}/activity?dateRange=${researchDateRange}`
    )
      .then((data) => {
        if (!ignore) setResearchStudentActivity(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '学生活动详情加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingResearchStudentActivity(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedResearchStudentId, researchDateRange, researchRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'CLICK_FLOW') return;

    let ignore = false;
    setIsLoadingClickFlow(true);
    setAdminError('');

    const params = new URLSearchParams({
      dateRange: clickFlowDateRange,
      eventType: clickFlowEventType,
      pageSize: '100'
    });

    if (clickFlowStudentId !== 'all') {
      params.set('userId', clickFlowStudentId);
    }

    apiRequest<ClickFlowSummary>(`/api/admin/click-flow/summary?${params.toString()}`)
      .then((data) => {
        if (!ignore) setClickFlowSummary(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '点击流加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingClickFlow(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, clickFlowDateRange, clickFlowEventType, clickFlowStudentId]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !canAccessPanel('system_data') || !selectedTable) return;

    let ignore = false;
    const params = new URLSearchParams({
      page: String(tablePage),
      pageSize: String(PAGE_SIZE)
    });
    if (searchTerm) params.set('search', searchTerm);
    if (statusField && statusValue) {
      params.set('statusField', statusField);
      params.set('status', statusValue);
    }
    if (dateField && dateRange !== 'all') {
      params.set('dateField', dateField);
      params.set('dateRange', dateRange);
    }

    setIsLoadingRows(true);
    setAdminError('');

    apiRequest<AdminTableListResponse>(`/api/admin/tables/${selectedTable}?${params.toString()}`)
      .then((data) => {
        if (ignore) return;
        setTableData(data);
        setSelectedRow(data.rows[0] ?? null);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '表记录加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingRows(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeTab, isAdmin, user.panelPermissions, selectedTable, tablePage, searchTerm, statusField, statusValue, dateField, dateRange, rowsRefreshKey]);

  useEffect(() => {
    const sessionId = selectedTable === 'simulation_sessions' && selectedRow
      ? formatValue(selectedRow.id)
      : '';

    if (!sessionId) {
      setSessionSummary(null);
      return;
    }

    let ignore = false;
    setIsLoadingSessionSummary(true);
    setSessionSummary(null);

    apiRequest<SessionSummary>(`/api/admin/sessions/${sessionId}/summary`)
      .then((data) => {
        if (!ignore) setSessionSummary(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '会话详情加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingSessionSummary(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTable, selectedRow]);

  useEffect(() => {
    const logId = selectedTable === 'ai_interaction_logs' && selectedRow
      ? formatValue(selectedRow.id)
      : '';

    if (!logId) {
      setAiLogSummary(null);
      return;
    }

    let ignore = false;
    setIsLoadingAiLogSummary(true);
    setAiLogSummary(null);

    apiRequest<AiLogSummary>(`/api/admin/ai-logs/${logId}/summary`)
      .then((data) => {
        if (!ignore) setAiLogSummary(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : 'AI 调用详情加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingAiLogSummary(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTable, selectedRow]);

  useEffect(() => {
    const userId =
      selectedRow && ['users', 'student_profile', 'student_auth'].includes(selectedTable)
        ? formatValue(selectedRow.id ?? selectedRow.userId)
        : '';

    if (!userId) {
      setStudentSummary(null);
      return;
    }

    let ignore = false;
    setIsLoadingStudentSummary(true);
    setStudentSummary(null);

    apiRequest<StudentSummary>(`/api/admin/students/${userId}/summary`)
      .then((data) => {
        if (!ignore) setStudentSummary(data);
      })
      .catch((error) => {
        if (!ignore) setAdminError(error instanceof Error ? error.message : '学生详情加载失败');
      })
      .finally(() => {
        if (!ignore) setIsLoadingStudentSummary(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTable, selectedRow]);

  const legacyHandleClone = (scenario: typeof scenarios[number]) => {
    setScenarios([
      ...scenarios,
      {
        ...scenario,
        id: String(Date.now()),
        name: `${scenario.name} (副本)`,
        type: 'Custom',
        isActive: false
      }
    ]);
  };

  const legacyHandleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsAddingNew(false);
      setSelectedScenarioId(null);
    }, 1000);
  };

  const openScenarioEditor = (scenario: PromptScenario) => {
    setSelectedScenarioId(scenario.id);
    setIsAddingNew(false);
    setScenarioForm({
      stageId: scenario.stageId,
      name: scenario.name,
      opponentName: scenario.opponentName ?? '',
      opponentRole: scenario.opponentRole ?? '',
      systemPrompt: scenario.systemPrompt,
      difficulty: scenario.difficulty,
      promptVersion: scenario.promptVersion,
      isDefault: scenario.isDefault,
      isActive: scenario.isActive
    });
  };

  const openNewScenario = () => {
    setSelectedScenarioId(null);
    setIsAddingNew(true);
    setScenarioForm({
      ...defaultScenarioForm,
      stageId: scenarioStages[0]?.id ?? ''
    });
  };

  const handleClone = (scenario: PromptScenario) => {
    setSelectedScenarioId(null);
    setIsAddingNew(true);
    setScenarioForm({
      stageId: scenario.stageId,
      name: `${scenario.name} (副本)`,
      opponentName: scenario.opponentName ?? '',
      opponentRole: scenario.opponentRole ?? '',
      systemPrompt: scenario.systemPrompt,
      difficulty: scenario.difficulty,
      promptVersion: scenario.promptVersion,
      isDefault: false,
      isActive: true
    });
  };

  const handleSave = async () => {
    if (!scenarioForm.stageId || !scenarioForm.name.trim() || !scenarioForm.systemPrompt.trim()) {
      setScenarioError('请填写场景、名称和提示词。');
      return;
    }

    setIsSaving(true);
    setScenarioError('');
    const payload = {
      ...scenarioForm,
      opponentName: scenarioForm.opponentName.trim() || null,
      opponentRole: scenarioForm.opponentRole.trim() || null
    };

    try {
      if (isAddingNew) {
        await apiRequest('/api/admin/scenarios', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else if (selectedScenarioId) {
        await apiRequest(`/api/admin/scenarios/${selectedScenarioId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      await loadScenarios();
      setIsAddingNew(false);
      setSelectedScenarioId(null);
    } catch (error) {
      setScenarioError(error instanceof Error ? error.message : '提示词模板保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const switchTable = (tableKey: string) => {
    setSelectedTable(tableKey);
    setTablePage(1);
    setSearchDraft('');
    setSearchTerm('');
    setStatusField('');
    setStatusValue('');
    setDateField('');
    setDateRange('all');
    setSelectedRow(null);
  };

  const submitSearch = () => {
    setTablePage(1);
    setSearchTerm(searchDraft.trim());
  };

  const changeAccountPassword = async () => {
    setAccountError('');
    setAccountMessage('');

    if (accountPasswordForm.newPassword.length < 6) {
      setAccountError('新密码至少 6 位');
      return;
    }
    if (accountPasswordForm.newPassword !== accountPasswordForm.confirmPassword) {
      setAccountError('两次输入的新密码不一致');
      return;
    }

    try {
      setChangingAccountPassword(true);
      await onPasswordChange(accountPasswordForm);
      setAccountPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setAccountMessage('密码已修改，请下次使用新密码登录。');
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : '密码修改失败，请稍后再试');
    } finally {
      setChangingAccountPassword(false);
    }
  };

  const setNewUserRole = (role: ManagedRoleKey) => {
    setNewUserForm((current) => ({ ...current, roleKeys: [role] }));
  };

  const setNewRolePermission = (permission: PanelPermissionKey, checked: boolean) => {
    setNewRoleForm((current) => {
      const nextPermissions = new Set(current.permissions);
      if (checked) {
        nextPermissions.add(permission);
      } else {
        nextPermissions.delete(permission);
      }
      return { ...current, permissions: Array.from(nextPermissions) as PanelPermissionKey[] };
    });
  };

  const createManagedUser = async () => {
    setUserManagerError('');
    setUserManagerMessage('');
    if (!newUserForm.username.trim() || !newUserForm.password) {
      setUserManagerError('请填写用户名和初始密码');
      return;
    }
    if (newUserForm.roleKeys.length !== 1) {
      setUserManagerError('请选择一个角色');
      return;
    }

    try {
      setSavingUserId('new');
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUserForm.username.trim(),
          email: newUserForm.email.trim() || null,
          password: newUserForm.password,
          status: newUserForm.status,
          roleKeys: newUserForm.roleKeys
        })
      });
      setNewUserForm({
        username: '',
        email: '',
        password: '',
        status: 'ACTIVE',
        roleKeys: [availableRoles.find((role) => role.key === 'teacher')?.key ?? availableRoles[0]?.key ?? 'teacher']
      });
      setUserManagerMessage('用户已创建');
      await loadUserManager();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '创建用户失败');
    } finally {
      setSavingUserId(null);
    }
  };

  const updateManagedUserDraft = (userId: string, patch: Partial<ManagedUser>) => {
    setUserManager((current) => {
      if (!current) return current;
      return {
        ...current,
        users: current.users.map((item) => (item.id === userId ? { ...item, ...patch } : item))
      };
    });
  };

  const selectManagedUserRole = (targetUser: ManagedUser, role: ManagedRoleKey) => {
    updateManagedUserDraft(targetUser.id, { roles: [role] });
  };

  const updateManagedRoleDraft = (roleId: string, patch: Partial<ManagedRole>) => {
    setUserManager((current) => {
      if (!current) return current;
      return {
        ...current,
        roles: current.roles.map((role) => (role.id === roleId ? { ...role, ...patch } : role))
      };
    });
  };

  const toggleManagedRolePermission = (role: ManagedRole, permission: PanelPermissionKey, checked: boolean) => {
    const nextPermissions = new Set(role.permissions);
    if (checked) {
      nextPermissions.add(permission);
    } else {
      nextPermissions.delete(permission);
    }
    updateManagedRoleDraft(role.id, { permissions: Array.from(nextPermissions) as PanelPermissionKey[] });
  };

  const createManagedRole = async () => {
    setUserManagerError('');
    setUserManagerMessage('');
    if (!newRoleForm.key.trim() || !newRoleForm.name.trim()) {
      setUserManagerError('请填写角色标识和角色名称');
      return;
    }

    try {
      setSavingRoleId('new');
      await apiRequest('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          key: newRoleForm.key.trim(),
          name: newRoleForm.name.trim(),
          permissions: newRoleForm.permissions
        })
      });
      setNewRoleForm({ key: '', name: '', permissions: ['resources'] });
      setUserManagerMessage('角色已创建');
      await loadUserManager();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '创建角色失败');
    } finally {
      setSavingRoleId(null);
    }
  };

  const saveManagedRole = async (role: ManagedRole) => {
    setUserManagerError('');
    setUserManagerMessage('');
    if (!role.name.trim()) {
      setUserManagerError('角色名称不能为空');
      return;
    }

    try {
      setSavingRoleId(role.id);
      await apiRequest(`/api/admin/roles/${role.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: role.name.trim(),
          permissions: role.permissions
        })
      });
      setUserManagerMessage('角色权限已保存');
      await loadUserManager();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '保存角色失败');
    } finally {
      setSavingRoleId(null);
    }
  };

  const deleteManagedRole = async (role: ManagedRole) => {
    if (role.isSystem) return;
    if (!window.confirm(`确定删除角色 ${role.name}？`)) return;

    try {
      setSavingRoleId(role.id);
      await apiRequest(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
      setUserManagerMessage('角色已删除');
      await loadUserManager();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '删除角色失败');
    } finally {
      setSavingRoleId(null);
    }
  };

  const saveProfileOption = async () => {
    setUserManagerError('');
    setUserManagerMessage('');
    const label = profileOptionForm.label.trim();
    const value = profileOptionForm.value.trim() || label;
    if (!label || !value) {
      setUserManagerError('请填写档案选项名称');
      return;
    }

    try {
      setSavingProfileOption(true);
      await apiRequest(
        profileOptionForm.id ? `/api/admin/profile-options/${profileOptionForm.id}` : '/api/admin/profile-options',
        {
          method: profileOptionForm.id ? 'PUT' : 'POST',
          body: JSON.stringify({
            category: profileOptionForm.category,
            value,
            label,
            sortOrder: profileOptionForm.sortOrder,
            isActive: profileOptionForm.isActive
          })
        }
      );
      setProfileOptionForm(emptyProfileOptionForm);
      setUserManagerMessage('档案选项已保存');
      await loadProfileOptions();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '保存档案选项失败');
    } finally {
      setSavingProfileOption(false);
    }
  };

  const disableProfileOption = async (option: ProfileOption) => {
    setUserManagerError('');
    setUserManagerMessage('');
    try {
      await apiRequest(`/api/admin/profile-options/${option.id}`, { method: 'DELETE' });
      setUserManagerMessage('档案选项已停用');
      if (profileOptionForm.id === option.id) setProfileOptionForm(emptyProfileOptionForm);
      await loadProfileOptions();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '停用档案选项失败');
    }
  };

  const saveManagedUser = async (targetUser: ManagedUser) => {
    setUserManagerError('');
    setUserManagerMessage('');
    if (!targetUser.username.trim()) {
      setUserManagerError('用户名不能为空');
      return;
    }
    if (targetUser.roles.length !== 1) {
      setUserManagerError('请选择一个角色');
      return;
    }

    try {
      setSavingUserId(targetUser.id);
      await apiRequest(`/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: targetUser.username.trim(),
          email: targetUser.email?.trim() || null,
          status: targetUser.status,
          roleKeys: targetUser.roles
        })
      });
      setUserManagerMessage('用户已保存');
      await loadUserManager();
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '保存用户失败');
    } finally {
      setSavingUserId(null);
    }
  };

  const resetManagedUserPassword = async (targetUser: ManagedUser) => {
    const password = window.prompt(`请输入 ${targetUser.username} 的新密码（至少 6 位）`);
    if (password === null) return;
    if (password.length < 6) {
      setUserManagerError('新密码至少 6 位');
      return;
    }

    try {
      setSavingUserId(targetUser.id);
      await apiRequest(`/api/admin/users/${targetUser.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      setUserManagerMessage('用户密码已重置');
    } catch (error) {
      setUserManagerError(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setSavingUserId(null);
    }
  };

  const selectedTableMeta = adminTables.find((table) => table.key === selectedTable);
  const currentStatusValues = statusField
    ? (tableData?.table.statusValues?.[statusField] ?? [])
    : [];

  const pageTitle = PAGE_TITLES[activeTab];

  const renderPlaceholder = (title: string, icon: React.ReactNode) => (
    <div className="bg-white rounded-[40px] border border-slate-100 p-20 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
      <div className="bg-indigo-50 p-6 rounded-[30px] text-indigo-600">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 48 }) : icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
        <p className="text-slate-400 max-w-sm">该模块正在开发集成中，预计将于下一版本正式发布。请先使用“提示词工程”进行实训配置。</p>
      </div>
    </div>
  );

  const renderUserManagement = () => {
    if (!canAccessPanel('users')) {
      return (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
          当前账号没有用户管理权限。
        </div>
      );
    }

    const users = userManager?.users ?? [];
    const normalizedUserSearch = userSearchTerm.trim().toLowerCase();
    const filteredUsers = users.filter((item) => {
      const matchesSearch = normalizedUserSearch
        ? getManagedUserSearchText(item).includes(normalizedUserSearch)
        : true;
      const matchesStatus = userStatusFilter === 'all' || item.status === userStatusFilter;
      const matchesRole = userRoleFilter === 'all' || item.roles.includes(userRoleFilter);
      return matchesSearch && matchesStatus && matchesRole;
    });
    const hskProfileOptions = profileOptions.filter((option) => option.category === 'hsk_level' && option.isActive);
    const majorProfileOptions = profileOptions.filter((option) => option.category === 'major' && option.isActive);
    const managedGroups = (userManager?.groups ?? []).filter((group) => group.isActive);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ['全部用户', userManager?.totals.userCount ?? 0],
            ['管理员', userManager?.totals.adminCount ?? 0],
            ['教师', userManager?.totals.teacherCount ?? 0],
            ['学生', userManager?.totals.studentCount ?? 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        {(userManagerError || userManagerMessage) && (
          <div className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
            userManagerError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {userManagerError || userManagerMessage}
          </div>
        )}

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">新增用户</h3>
              <p className="text-sm text-slate-500">为用户分配一个或多个角色，后台板块访问由角色权限决定。</p>
            </div>
            <UserPlus className="text-indigo-500" size={22} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={newUserForm.username}
              onChange={(e) => setNewUserForm((current) => ({ ...current, username: e.target.value }))}
              placeholder="用户名"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((current) => ({ ...current, email: e.target.value }))}
              placeholder="邮箱（可选）"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
            <input
              type="password"
              value={newUserForm.password}
              onChange={(e) => setNewUserForm((current) => ({ ...current, password: e.target.value }))}
              placeholder="初始密码"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
            <select
              value={newUserForm.status}
              onChange={(e) => setNewUserForm((current) => ({ ...current, status: e.target.value as ManagedUser['status'] }))}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
            >
              {USER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="grid w-full max-w-[520px] grid-cols-2 gap-2 md:grid-cols-4">
              {availableRoles.map((role) => {
                const checked = getSelectedManagedRoleKey(newUserForm.roleKeys) === role.key;
                return (
                  <label
                    key={role.key}
                    className={`flex h-10 min-w-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                      checked
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                    title={role.name}
                  >
                    <input
                      type="radio"
                      name="new-user-role"
                      checked={checked}
                      onChange={() => setNewUserRole(role.key)}
                      className="h-4 w-4 shrink-0 accent-indigo-600"
                    />
                    <span className="truncate">{role.name}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={createManagedUser}
              disabled={savingUserId === 'new'}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 disabled:opacity-60"
            >
              {savingUserId === 'new' ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              创建用户
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">角色与板块权限</h3>
              <p className="text-sm text-slate-500">系统管理员固定拥有所有权限；其他角色可以配置可访问板块。</p>
            </div>
            <ShieldCheck className="text-indigo-500" size={22} />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="grid gap-3 xl:grid-cols-[180px_220px_minmax(0,1fr)_auto]">
              <input
                value={newRoleForm.key}
                onChange={(e) => setNewRoleForm((current) => ({ ...current, key: e.target.value }))}
                placeholder="role_key"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <input
                value={newRoleForm.name}
                onChange={(e) => setNewRoleForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="角色名称"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {(availablePanels.length ? availablePanels : FALLBACK_PANELS).map((panel) => (
                  <label key={panel.key} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={newRoleForm.permissions.includes(panel.key)}
                      onChange={(e) => setNewRolePermission(panel.key, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-indigo-600"
                    />
                    <span className="truncate">{panel.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={createManagedRole}
                disabled={savingRoleId === 'new'}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-60"
              >
                {savingRoleId === 'new' ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                新增角色
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {availableRoles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-[260px] max-w-md flex-1 items-center gap-3">
                    <span className="w-24 shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-center text-xs font-black text-slate-500">{role.key}</span>
                    <input
                      value={role.name}
                      onChange={(e) => updateManagedRoleDraft(role.id, { name: e.target.value })}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveManagedRole(role)}
                      disabled={savingRoleId === role.id}
                      className="inline-flex h-10 w-20 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {savingRoleId === role.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                      保存
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => deleteManagedRole(role)}
                        disabled={savingRoleId === role.id}
                        className="h-10 w-16 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {(availablePanels.length ? availablePanels : FALLBACK_PANELS).map((panel) => {
                    const checked = role.key === 'admin' || role.permissions.includes(panel.key);
                    return (
                      <label
                        key={panel.key}
                        className={`flex h-10 min-w-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                          checked
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        } ${role.key === 'admin' ? 'opacity-70' : ''}`}
                        title={role.key === 'admin' ? '系统管理员固定拥有全部权限' : panel.label}
                      >
                        <input
                          type="checkbox"
                          disabled={role.key === 'admin'}
                          checked={checked}
                          onChange={(e) => toggleManagedRolePermission(role, panel.key, e.target.checked)}
                          className="h-4 w-4 shrink-0 accent-indigo-600"
                        />
                        <span className="truncate">{panel.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">学生档案属性</h3>
              <p className="text-sm text-slate-500">这里维护 HSK 等级和专业方向；班级/组直接使用分组管理中的现有分组。</p>
            </div>
            <GraduationCap className="text-indigo-500" size={22} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {[
              ['HSK 等级', hskProfileOptions],
              ['专业方向', majorProfileOptions]
            ].map(([title, options]) => {
              const category = title === 'HSK 等级' ? 'hsk_level' : 'major';
              const isActiveForm = profileOptionForm.category === category;
              return (
              <div key={String(title)} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-black text-slate-900">{String(title)}</h4>
                  <button
                    type="button"
                    onClick={() => setProfileOptionForm({ ...emptyProfileOptionForm, category })}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-indigo-600 hover:bg-indigo-50"
                  >
                    + 新增
                  </button>
                </div>
                {isActiveForm && (
                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3">
                    <div className="grid gap-2">
                      <input
                        value={profileOptionForm.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          setProfileOptionForm((current) => ({
                            ...current,
                            label,
                            value: current.id ? current.value : label
                          }));
                        }}
                        placeholder={category === 'major' ? '专业方向名称，如 商务汉语' : 'HSK 等级名称，如 HSK 6'}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                      />
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          type="number"
                          value={profileOptionForm.sortOrder}
                          onChange={(e) => setProfileOptionForm((current) => ({ ...current, sortOrder: Number(e.target.value) }))}
                          placeholder="排序"
                          className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                        />
                        <select
                          value={profileOptionForm.isActive ? 'true' : 'false'}
                          onChange={(e) => setProfileOptionForm((current) => ({ ...current, isActive: e.target.value === 'true' }))}
                          className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                        >
                          <option value="true">启用</option>
                          <option value="false">停用</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void saveProfileOption()}
                          disabled={savingProfileOption}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {savingProfileOption ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                          {profileOptionForm.id ? '保存' : '新增'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfileOptionForm(emptyProfileOptionForm)}
                        className="text-left text-xs font-bold text-slate-400 hover:text-slate-700"
                      >
                        取消编辑
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(options as ProfileOption[]).map((option) => (
                    <div key={option.id} className="flex min-w-[140px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setProfileOptionForm({
                          id: option.id,
                          category: option.category,
                          value: option.value,
                          label: option.label,
                          sortOrder: option.sortOrder,
                          isActive: option.isActive
                        })}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-black text-slate-900">{option.label}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">
                          {option.isActive ? '启用' : '已停用'} · 排序 {option.sortOrder}
                        </p>
                      </button>
                      {option.isActive && (
                        <button
                          type="button"
                          onClick={() => void disableProfileOption(option)}
                          className="shrink-0 rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                          title="停用"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(options as ProfileOption[]).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs font-semibold text-slate-400">
                      暂无选项。
                    </div>
                  )}
                </div>
              </div>
              );
            })}

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="text-sm font-black text-slate-900">班级/组</h4>
              <p className="mt-1 text-xs font-semibold text-slate-400">来自分组管理，不在这里重复新建。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="min-w-[140px] flex-1 rounded-2xl border border-slate-100 bg-white px-3 py-2">
                  <p className="text-sm font-black text-slate-900">其他</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">默认选项</p>
                </div>
                {managedGroups.map((group) => (
                  <div key={group.id} className="min-w-[160px] flex-1 rounded-2xl border border-slate-100 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black text-slate-900">{group.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                        {group.memberCount}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
                      {group.isActive ? '启用' : '已停用'} · {group.description || '无说明'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">用户列表</h3>
              <p className="text-sm text-slate-500">
                可按用户名、邮箱、真实姓名搜索。当前显示 {filteredUsers.length} / {users.length} 个用户。
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <select
                value={userStatusFilter}
                onChange={(event) => setUserStatusFilter(event.target.value as 'all' | ManagedUser['status'])}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                aria-label="按用户状态过滤"
              >
                <option value="all">全部状态</option>
                {USER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={userRoleFilter}
                onChange={(event) => setUserRoleFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                aria-label="按用户角色过滤"
              >
                <option value="all">全部角色</option>
                {availableRoles.map((role) => (
                  <option key={role.key} value={role.key}>{role.name}</option>
                ))}
              </select>
              <div className="relative min-w-[260px] flex-1 lg:w-80 lg:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={userSearchTerm}
                  onChange={(event) => setUserSearchTerm(event.target.value)}
                  placeholder="搜索用户名 / 邮箱 / 真实姓名"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
                {userSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setUserSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title="清空搜索"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={loadUserManager}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={14} /> 刷新
              </button>
            </div>
          </div>

          {isLoadingUsers && !userManager ? (
            <div className="flex items-center gap-3 p-6 text-sm font-semibold text-slate-500">
              <Loader2 className="animate-spin text-indigo-500" size={18} />
              正在加载用户...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[180px]" />
                  <col className="w-[240px]" />
                  <col className="w-[120px]" />
                  <col className="w-[500px]" />
                  <col className="w-[150px]" />
                  <col className="w-[190px]" />
                </colgroup>
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-3 py-4">用户</th>
                    <th className="px-3 py-4">邮箱</th>
                    <th className="px-3 py-4">状态</th>
                    <th className="px-3 py-4">角色</th>
                    <th className="px-3 py-4">创建时间</th>
                    <th className="px-3 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((item) => {
                    const isSelf = item.id === userManager?.currentUserId;
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-3 py-4">
                          <input
                            value={item.username}
                            onChange={(e) => updateManagedUserDraft(item.id, { username: e.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
                          />
                          {isSelf && <p className="mt-1 text-xs font-bold text-indigo-600">当前账号</p>}
                        </td>
                        <td className="px-3 py-4">
                          <input
                            value={item.email ?? ''}
                            onChange={(e) => updateManagedUserDraft(item.id, { email: e.target.value })}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <select
                            value={item.status}
                            onChange={(e) => updateManagedUserDraft(item.id, { status: e.target.value as ManagedUser['status'] })}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
                          >
                            {USER_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {availableRoles.map((role) => {
                              const checked = getSelectedManagedRoleKey(item.roles) === role.key;
                              return (
                                <label
                                  key={role.key}
                                  className={`flex h-9 w-[116px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                                    checked
                                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                  }`}
                                  title={role.name}
                                >
                                  <input
                                    type="radio"
                                    name={`user-role-${item.id}`}
                                    checked={checked}
                                    onChange={() => selectManagedUserRole(item, role.key)}
                                    className="h-4 w-4 shrink-0 accent-indigo-600"
                                  />
                                  <span className="truncate">{role.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-xs font-semibold text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="min-w-[180px] px-3 py-4">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => resetManagedUserPassword(item)}
                              disabled={savingUserId === item.id}
                              className="inline-flex h-10 w-20 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                              title="重置密码"
                            >
                              重置
                            </button>
                            <button
                              type="button"
                              onClick={() => saveManagedUser(item)}
                              disabled={savingUserId === item.id}
                              className="inline-flex h-10 w-20 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60"
                            >
                              {savingUserId === item.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                              保存
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td className="px-5 py-10 text-center text-sm font-semibold text-slate-400" colSpan={6}>
                        没有匹配的用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderClickFlow = () => {
    if (isLoadingClickFlow && !clickFlowSummary) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-slate-400 flex items-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
          正在加载点击流...
        </div>
      );
    }

    if (!clickFlowSummary) return null;

    const rows = clickFlowSummary.rows;
    const maxEventCount = Math.max(1, ...clickFlowSummary.eventBreakdown.map((item) => item.count));
    const maxStageCount = Math.max(1, ...clickFlowSummary.stageBreakdown.map((item) => item.count));
    const topStudents = clickFlowSummary.students.slice(0, 8);
    const selectedStudent = clickFlowSummary.students.find((item) => item.userId === clickFlowStudentId);
    const getStudentLabel = (item: ClickFlowSummary['students'][number]) => {
      const name = item.displayName || item.username || '未知学生';
      return `${name} · ${item.eventCount} 条`;
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['行为记录', clickFlowSummary.total, '学生动作总数'],
            ['界面点击', clickFlowSummary.uiClickCount, '按钮、入口和控件点击'],
            ['页面浏览', clickFlowSummary.pageViewCount, '学生打开页面次数'],
            ['活跃学生', clickFlowSummary.activeStudentCount, '该时间范围内有行为的学生']
          ].map(([label, value, detail]) => (
            <div key={String(label)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-black text-slate-500">{label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-3xl font-black text-slate-900">{value}</span>
                <MousePointerClick size={18} className="text-indigo-400" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-400">{detail}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Behavior Flow</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">学生行为流</h3>
              <p className="mt-1 text-xs text-slate-400">
                {selectedStudent ? `当前学生：${selectedStudent.displayName || selectedStudent.username || '未知学生'} · ` : ''}
                更新于 {new Date(clickFlowSummary.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={clickFlowStudentId}
                onChange={(event) => setClickFlowStudentId(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                <option value="all">全部学生</option>
                {clickFlowSummary.students
                  .filter((item) => item.userId)
                  .map((item) => (
                    <option key={item.userId ?? ''} value={item.userId ?? ''}>
                      {getStudentLabel(item)}
                    </option>
                  ))}
              </select>
              {(['all', 'ui_click', 'page_view'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setClickFlowEventType(type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    clickFlowEventType === type
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {type === 'all' ? '全部' : formatEventTypeLabel(type)}
                </button>
              ))}
              <select
                value={clickFlowDateRange}
                onChange={(event) => setClickFlowDateRange(event.target.value as (typeof DATE_RANGES)[number]['value'])}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 bg-slate-50/60 p-6 xl:grid-cols-[1.1fr_1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h4 className="text-sm font-black text-slate-900">事件构成</h4>
              <div className="mt-4 space-y-3">
                {clickFlowSummary.eventBreakdown.map((item) => {
                  const percent = Math.max(5, Math.round((item.count / maxEventCount) * 100));
                  return (
                    <div key={item.eventType}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">{formatEventTypeLabel(item.eventType)}</span>
                        <span className="font-black text-slate-900">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
                {clickFlowSummary.eventBreakdown.length === 0 && <p className="text-xs text-slate-400">暂无事件数据</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h4 className="text-sm font-black text-slate-900">阶段路径</h4>
              <div className="mt-4 space-y-3">
                {clickFlowSummary.stageBreakdown.map((item, index) => {
                  const percent = Math.max(5, Math.round((item.count / maxStageCount) * 100));
                  const label = item.titleZh || formatStageName(item.key) || '未关联阶段';
                  return (
                    <div key={item.stageId ?? item.key ?? `stage-${index}`}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">{label}</span>
                        <span className="font-black text-slate-900">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
                {clickFlowSummary.stageBreakdown.length === 0 && <p className="text-xs text-slate-400">暂无阶段数据</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h4 className="text-sm font-black text-slate-900">学生排行</h4>
              <div className="mt-4 space-y-2">
                {topStudents.map((item) => (
                  <button
                    key={item.userId ?? item.username ?? 'unknown'}
                    type="button"
                    onClick={() => item.userId && setClickFlowStudentId(item.userId)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                      clickFlowStudentId === item.userId
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold">{item.displayName || item.username || '未知学生'}</span>
                    <span className="font-black">{item.eventCount}</span>
                  </button>
                ))}
                {topStudents.length === 0 && <p className="text-xs text-slate-400">暂无学生数据</p>}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">最近行为时间线</h4>
                <p className="mt-1 text-xs text-slate-400">按时间倒序展示学生最近做了什么，点击学生排行可只看某个学生。</p>
              </div>
              {isLoadingClickFlow && <Loader2 className="animate-spin text-indigo-500" size={18} />}
            </div>
            <div className="space-y-3">
              {rows.map((row) => {
                const meta = getPracticeEventMeta(row);
                const metadata = asRecord(row.metadataJson);
                const page = formatPageName(metadata.page);
                const stage = formatValue(asRecord(row.stage).titleZh) || formatStageName(metadata.stage);
                const studentName = formatValue(row.displayName ?? row.username) || '未知学生';
                return (
                  <div key={row.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[150px_1fr_170px]">
                    <div className="text-xs font-semibold text-slate-400">{new Date(row.createdAt).toLocaleString()}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600">
                          {meta.label}
                        </span>
                        {stage && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{stage}</span>}
                        {page && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{page}</span>}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{meta.description}</p>
                      {row.sessionId && (
                        <p className="mt-1 text-[10px] font-mono text-slate-300">会话 {String(row.sessionId).slice(0, 8)}</p>
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-black text-slate-700">{studentName}</p>
                      {row.username && row.displayName !== row.username ? (
                        <p className="mt-1 font-mono text-[10px] text-slate-400">{formatValue(row.username)}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">
                  当前筛选条件下暂无点击流
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAccountSettings = () => (
    <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Account</p>
        <h3 className="mt-2 text-2xl font-black text-slate-900">当前账号</h3>
        <div className="mt-6 space-y-3">
          {[
            ['登录名', user.username],
            ['邮箱', user.email || '未记录'],
            ['身份', user.role || '教师'],
            ['当前角色', currentRoleText]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-2 text-sm font-black text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Password</p>
        <h3 className="mt-2 text-2xl font-black text-slate-900">修改密码</h3>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <input
            type="password"
            value={accountPasswordForm.currentPassword}
            onChange={(event) => setAccountPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            placeholder="当前密码"
          />
          <input
            type="password"
            value={accountPasswordForm.newPassword}
            onChange={(event) => setAccountPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            placeholder="新密码"
          />
          <input
            type="password"
            value={accountPasswordForm.confirmPassword}
            onChange={(event) => setAccountPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            placeholder="确认新密码"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold">
            {accountError ? <span className="text-rose-500">{accountError}</span> : null}
            {accountMessage ? <span className="text-emerald-600">{accountMessage}</span> : null}
          </div>
          <button
            onClick={() => void changeAccountPassword()}
            disabled={changingAccountPassword}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 disabled:opacity-60"
          >
            <Save size={16} />
            {changingAccountPassword ? '保存中...' : '保存新密码'}
          </button>
        </div>
      </section>
    </div>
  );

  const renderSessionSummary = () => {
    if (isLoadingSessionSummary) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-slate-400 flex items-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
          正在加载会话详情...
        </div>
      );
    }

    if (!sessionSummary) {
      return null;
    }

    const student = sessionSummary.session.user ?? {};
    const profile = student.studentProfile as Record<string, unknown> | null | undefined;
    const stage = sessionSummary.session.businessStage ?? {};
    const scenario = sessionSummary.session.scenario ?? {};

    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Session Summary</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              {formatValue(stage.titleZh) || formatValue(sessionSummary.session.stage)} · {formatValue(sessionSummary.session.status)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              学生 {formatValue(student.username) || '未知'} · 尝试 {formatValue(sessionSummary.session.attemptNo)}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-black ${sessionSummary.stats.degradedAiCallCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            fallback {sessionSummary.stats.degradedAiCallCount}
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['消息', sessionSummary.stats.messageCount],
            ['学生消息', sessionSummary.stats.studentMessageCount],
            ['AI 调用', sessionSummary.stats.aiCallCount],
            ['练习事件', sessionSummary.stats.practiceEventCount]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">学生信息</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>账号：{formatValue(student.username) || '-'}</p>
              <p>姓名：{formatValue(profile?.realName ?? profile?.name) || '-'}</p>
              <p>学号：{formatValue(profile?.studentNo) || '-'}</p>
              <p>HSK：{formatValue(profile?.hskLevel) || '-'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">任务与场景</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>阶段：{formatValue(stage.titleZh) || '-'}</p>
              <p>任务：{formatValue((sessionSummary.session.task as Record<string, unknown> | null | undefined)?.title) || '-'}</p>
              <p>对手：{formatValue(scenario.opponentName) || '-'}</p>
              <p>难度：{formatValue(scenario.difficulty) || '-'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最近 AI 调用</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              {sessionSummary.aiLogs[0] ? (
                <>
                  <p>provider：{formatValue(sessionSummary.aiLogs[0].provider)}</p>
                  <p>model：{formatValue(sessionSummary.aiLogs[0].model) || '-'}</p>
                  <p>degraded：{formatValue(sessionSummary.aiLogs[0].degraded)}</p>
                  <p>latency：{formatValue(sessionSummary.aiLogs[0].latencyMs) || '-'} ms</p>
                </>
              ) : (
                <p>暂无 AI 调用</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">完整对话</p>
            <div className="space-y-3 max-h-[360px] overflow-auto pr-2">
              {sessionSummary.messages.map((message) => (
                <div key={message.id} className={`rounded-2xl p-4 ${message.role === 'student' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-100'}`}>
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest opacity-70">
                    <span>{message.role} · turn {message.turnIndex}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">AI 调用与事件</p>
            <div className="space-y-4 max-h-[360px] overflow-auto pr-2">
              {sessionSummary.aiLogs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black">{formatValue(log.provider)} · {formatValue(log.model) || 'model -'}</p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${log.degraded ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                      degraded {formatValue(log.degraded)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">latency {formatValue(log.latencyMs) || '-'} ms · {new Date(log.createdAt).toLocaleString()}</p>
                  {log.errorMessage && <p className="mt-2 text-xs text-rose-200">{log.errorMessage}</p>}
                  {log.outputText && <p className="mt-3 text-sm leading-6 text-slate-100">{formatCell(log.outputText)}</p>}
                </div>
              ))}
              {sessionSummary.aiLogs.length === 0 && <p className="text-sm text-slate-400">暂无 AI 调用日志</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentSummary = () => {
    if (isLoadingStudentSummary) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-slate-400 flex items-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
          正在加载学生详情...
        </div>
      );
    }

    if (!studentSummary) return null;

    const profile = studentSummary.user.studentProfile ?? {};
    const auth = studentSummary.user.studentAuth ?? {};

    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Student Summary</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              {formatValue(profile.realName ?? profile.name) || formatValue(studentSummary.user.username)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              账号 {formatValue(studentSummary.user.username)} · 学号 {formatValue(profile.studentNo) || '-'}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-black ${studentSummary.stats.profileCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {studentSummary.stats.profileCompleted ? '资料已完成' : '资料未完成'}
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['会话', studentSummary.stats.sessionCount],
            ['消息', studentSummary.stats.messageCount],
            ['练习事件', studentSummary.stats.practiceEventCount],
            ['AI 调用', studentSummary.stats.aiCallCount],
            ['fallback', studentSummary.stats.degradedAiCallCount]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">学生资料</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>登录身份：{formatValue(auth.idOrName) || '-'}</p>
              <p>姓名：{formatValue(profile.realName ?? profile.name) || '-'}</p>
              <p>国籍：{formatValue(profile.nationality) || '-'}</p>
              <p>HSK：{formatValue(profile.hskLevel) || '-'}</p>
              <p>专业：{formatValue(profile.major) || '-'}</p>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最近会话</p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {studentSummary.recentSessions.slice(0, 4).map((session) => (
                <div key={formatValue(session.id)} className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="font-black text-slate-800">{formatValue(session.title) || formatValue(session.stage)}</p>
                  <p className="mt-1">状态：{formatValue(session.status)} · 尝试 {formatValue(session.attemptNo)}</p>
                  <p className="mt-1 text-slate-400">{session.updatedAt ? new Date(formatValue(session.updatedAt)).toLocaleString() : '-'}</p>
                </div>
              ))}
              {studentSummary.recentSessions.length === 0 && <p className="text-xs text-slate-400">暂无会话</p>}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">最近消息</p>
            <div className="space-y-3 max-h-[360px] overflow-auto pr-2">
              {studentSummary.recentMessages.map((message) => (
                <div key={message.id} className={`rounded-2xl p-4 ${message.role === 'student' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-100'}`}>
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest opacity-70">
                    <span>{message.role}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
              {studentSummary.recentMessages.length === 0 && <p className="text-sm text-slate-400">暂无消息</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">最近 AI 与事件</p>
            <div className="space-y-4 max-h-[360px] overflow-auto pr-2">
              {studentSummary.recentAiLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black">{formatValue(log.provider)} · {formatValue(log.model) || 'model -'}</p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${log.degraded ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                      degraded {formatValue(log.degraded)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">latency {formatValue(log.latencyMs) || '-'} ms · {new Date(log.createdAt).toLocaleString()}</p>
                  {log.outputText && <p className="mt-3 text-sm leading-6 text-slate-100">{formatCell(log.outputText)}</p>}
                </div>
              ))}
              {studentSummary.recentPracticeEvents.slice(0, 6).map((event) => (
                <div key={formatValue(event.id)} className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs font-black text-slate-100">{formatValue(event.eventType)}</p>
                  <p className="mt-1 text-xs text-slate-400">{event.createdAt ? new Date(formatValue(event.createdAt)).toLocaleString() : '-'}</p>
                </div>
              ))}
              {studentSummary.recentAiLogs.length === 0 && studentSummary.recentPracticeEvents.length === 0 && (
                <p className="text-sm text-slate-400">暂无 AI 调用或练习事件</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAiLogSummary = () => {
    if (isLoadingAiLogSummary) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-slate-400 flex items-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
          正在加载 AI 调用详情...
        </div>
      );
    }

    if (!aiLogSummary) return null;

    const { log } = aiLogSummary;
    const user = log.user ?? {};
    const profile = user.studentProfile as Record<string, unknown> | null | undefined;
    const session = log.session ?? {};
    const stage = log.stage ?? {};
    const message = log.message ?? {};

    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Log Summary</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">
              {formatValue(log.provider)} · {formatValue(log.model) || 'model -'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {formatValue(stage.titleZh) || formatValue(session.stage) || '未知阶段'} · {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-black ${log.degraded ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            degraded {formatValue(log.degraded)}
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['provider', formatValue(log.provider)],
            ['model', formatValue(log.model) || '-'],
            ['latency', `${formatValue(log.latencyMs) || '-'} ms`],
            ['prompt', formatValue(log.promptVersion) || '-']
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="mt-2 text-sm font-black text-slate-900 break-all">{value}</p>
            </div>
          ))}
        </div>

        {(log.errorCode || log.errorMessage) && (
          <div className="mx-6 mb-6 rounded-2xl bg-rose-50 p-4 text-rose-700">
            <p className="text-[10px] font-black uppercase tracking-widest">错误信息</p>
            <p className="mt-2 text-sm font-bold">{formatValue(log.errorCode) || 'ERROR'}</p>
            <p className="mt-1 text-sm leading-6">{formatValue(log.errorMessage)}</p>
          </div>
        )}

        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">关联学生</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>账号：{formatValue(user.username) || '-'}</p>
              <p>姓名：{formatValue(profile?.realName ?? profile?.name) || '-'}</p>
              <p>状态：{formatValue(user.status) || '-'}</p>
              <p>userId：{formatValue(aiLogSummary.links.userId) || '-'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">关联会话</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>阶段：{formatValue(stage.titleZh) || formatValue(session.stage) || '-'}</p>
              <p>状态：{formatValue(session.status) || '-'}</p>
              <p>尝试：{formatValue(session.attemptNo) || '-'}</p>
              <p>sessionId：{formatValue(aiLogSummary.links.sessionId) || '-'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">关联消息</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>角色：{formatValue(message.role) || '-'}</p>
              <p>turn：{formatValue(message.turnIndex) || '-'}</p>
              <p>messageId：{formatValue(aiLogSummary.links.messageId) || '-'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">输入</p>
            {log.systemPrompt && (
              <div className="mb-4 rounded-2xl bg-white border border-slate-100 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">system prompt</p>
                <p className="mt-2 text-xs leading-6 text-slate-600 whitespace-pre-wrap">{formatCell(log.systemPrompt)}</p>
              </div>
            )}
            <pre className="max-h-[360px] overflow-auto rounded-2xl bg-white border border-slate-100 p-4 text-xs leading-6 text-slate-700">
              {JSON.stringify(log.inputMessagesJson ?? {}, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">输出与邻近消息</p>
            {log.outputText && (
              <div className="mb-4 rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">output text</p>
                <p className="mt-2 text-sm leading-6 text-slate-100 whitespace-pre-wrap">{log.outputText}</p>
              </div>
            )}
            <pre className="max-h-[220px] overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(log.outputJson ?? {}, null, 2)}
            </pre>
            <div className="mt-4 space-y-2 max-h-[260px] overflow-auto pr-2">
              {aiLogSummary.relatedMessages.map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {item.role} · turn {item.turnIndex}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-100">{formatCell(item.content)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const runResearchAiQuery = async (questionOverride?: string) => {
    const question = (questionOverride ?? researchAiQuestion).trim();
    if (!question) return;
    try {
      setResearchAiLoading(true);
      setResearchAiError('');
      setResearchAiPendingQuestion(question);
      setResearchAiQuestion('');
      const requestContext = sanitizeResearchAiContext(researchAiContext);
      const data = await apiRequest<ResearchAiResult>('/api/research/ai/query', {
        method: 'POST',
        body: JSON.stringify({ question, context: requestContext })
      });
      setResearchAiResult(data);
      setResearchAiTurns((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          question,
          result: data
        }
      ].slice(-12));
      setResearchAiContext((current) => {
        const next = sanitizeResearchAiContext([...current, { question: data.question, answer: data.answer }]);
        try {
          localStorage.setItem('research_ai_context', JSON.stringify(next));
        } catch {
          // ignore localStorage failures
        }
        return next;
      });
      setResearchAiPage(1);
      setResearchAiSortColumn('');
      setResearchAiFilterText('');
      setResearchAiHistory((current) => {
        const next = [
          { ts: new Date().toISOString(), question: data.question, sql: data.sql, rowCount: data.rowCount },
          ...current
        ].slice(0, 20);
        try {
          localStorage.setItem('research_ai_history', JSON.stringify(next));
        } catch {
          // ignore localStorage failures
        }
        return next;
      });
    } catch (error) {
      setResearchAiError(error instanceof Error ? error.message : 'AI 分析请求失败');
      setResearchAiQuestion((current) => current || question);
    } finally {
      setResearchAiPendingQuestion('');
      setResearchAiLoading(false);
    }
  };

  const discoverResearchTopics = async () => {
    try {
      setTopicDiscoveryLoading(true);
      setTopicDiscoveryError('');
      const data = await apiRequest<ResearchTopicDiscovery>('/api/research/ai/discover-topics', {
        method: 'POST',
        body: JSON.stringify({})
      });
      setTopicDiscovery(data);
    } catch (error) {
      setTopicDiscoveryError(error instanceof Error ? error.message : '科研 topic 扫描失败');
    } finally {
      setTopicDiscoveryLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('research_ai_history');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ResearchAiHistoryItem[];
      if (Array.isArray(parsed)) setResearchAiHistory(parsed.slice(0, 20));
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('research_ai_feedback');
      if (!raw) return;
      setResearchAiFeedback(JSON.parse(raw) as Record<string, 'up' | 'down'>);
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('research_ai_context');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ResearchAiContextItem[];
      if (Array.isArray(parsed)) setResearchAiContext(sanitizeResearchAiContext(parsed));
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    const scroller = researchAiScrollRef.current;
    if (!scroller) return;

    const frame = window.requestAnimationFrame(() => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [researchAiTurns.length, researchAiLoading, researchAiPendingQuestion, researchAiError]);

  const handleResearchAiKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!researchAiLoading && researchAiQuestion.trim()) {
      void runResearchAiQuery();
    }
  };

  const getResearchStudentName = (row?: ResearchStudentRow | ResearchStudentActivity | null) => {
    const userRecord = row && 'user' in row ? row.user : null;
    const profile = userRecord?.studentProfile ?? {};
    return formatValue(profile.realName ?? profile.name) || formatValue(userRecord?.username) || '未知学生';
  };

  const fetchResearchStudentActivity = (studentId: string) =>
    apiRequest<ResearchStudentActivity>(
      `/api/admin/research/students/${studentId}/activity?dateRange=${researchDateRange}`
    );

  const toggleResearchStudentSelection = (studentId: string, checked: boolean) => {
    setSelectedResearchStudentIds((current) => {
      if (checked) return current.includes(studentId) ? current : [...current, studentId];
      return current.filter((id) => id !== studentId);
    });
  };

  const buildResearchStudentExportRows = (activity: ResearchStudentActivity) => {
    const profile = activity.user.studentProfile ?? {};
    const auth = activity.user.studentAuth ?? {};
    const studentBase = {
      anonymousUserCode: activity.user.anonymousUserCode,
      username: activity.user.username,
      name: formatValue(profile.realName ?? profile.name),
      studentNo: formatValue(profile.studentNo),
      idOrName: formatValue(auth.idOrName),
      nationality: formatValue(profile.nationality),
      hskLevel: formatValue(profile.hskLevel),
      major: formatValue(profile.major)
    };

    return [
      ...activity.messages.map((message) => ({
        recordType: 'message',
        ...studentBase,
        createdAt: message.createdAt,
        sessionId: message.sessionId,
        role: message.role,
        turnIndex: message.turnIndex,
        content: message.content,
        provider: '',
        model: '',
        eventType: ''
      })),
      ...activity.aiLogs.map((log) => ({
        recordType: 'ai_log',
        ...studentBase,
        createdAt: log.createdAt,
        sessionId: formatValue(log.sessionId),
        role: '',
        turnIndex: '',
        content: formatValue(log.outputText),
        provider: formatValue(log.provider),
        model: formatValue(log.model),
        eventType: log.degraded ? 'degraded' : 'normal'
      })),
      ...activity.practiceEvents.map((event) => ({
        recordType: 'practice_event',
        ...studentBase,
        createdAt: formatValue(event.createdAt),
        sessionId: formatValue(event.sessionId),
        role: '',
        turnIndex: '',
        content: formatCell(event.metadataJson),
        provider: '',
        model: '',
        eventType: formatValue(event.eventType)
      }))
    ];
  };

  const buildResearchStudentDirectoryExportRows = (directory: ResearchStudentDirectory) =>
    directory.rows.map((row) => {
      const profile = row.user.studentProfile ?? {};
      const auth = row.user.studentAuth ?? {};
      return {
        anonymousUserCode: row.user.anonymousUserCode,
        username: row.user.username,
        name: formatValue(profile.realName ?? profile.name),
        studentNo: formatValue(profile.studentNo),
        idOrName: formatValue(auth.idOrName),
        email: formatValue(row.user.email),
        status: formatValue(row.user.status),
        groups: (row.user.groups ?? []).map((group) => formatValue(group.name)).filter(Boolean).join(' / '),
        sessionCount: row.stats.sessionCount,
        messageCount: row.stats.messageCount,
        studentMessageCount: row.stats.studentMessageCount,
        aiCallCount: row.stats.aiCallCount,
        degradedAiCallCount: row.stats.degradedAiCallCount,
        practiceEventCount: row.stats.practiceEventCount,
        lastActivityAt: formatValue(row.lastActivityAt)
      };
    });

  const downloadResearchStudentCsv = async () => {
    if (!selectedResearchStudentIds.length) return;
    setIsDownloadingResearchStudents(true);
    try {
      const activities = await Promise.all(selectedResearchStudentIds.map((id) => fetchResearchStudentActivity(id)));
      const csv = toCsv(activities.flatMap((activity) => buildResearchStudentExportRows(activity)));
      if (!csv) return;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-research-selected-${selectedResearchStudentIds.length}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingResearchStudents(false);
    }
  };

  const downloadAllResearchStudentsCsv = async () => {
    setIsDownloadingResearchStudents(true);
    try {
      const rows: ResearchStudentRow[] = [];
      let page = 1;
      let total = Number.POSITIVE_INFINITY;
      while (rows.length < total) {
        const params = new URLSearchParams({
          dateRange: researchDateRange,
          search: researchStudentSearch,
          page: String(page),
          pageSize: '500'
        });
        const data = await apiRequest<ResearchStudentDirectory>(`/api/admin/research/students?${params.toString()}`);
        rows.push(...data.rows);
        total = data.total;
        if (data.rows.length === 0) break;
        page += 1;
      }
      const csv = toCsv(buildResearchStudentDirectoryExportRows({
        generatedAt: new Date().toISOString(),
        dateRange: researchDateRange,
        search: researchStudentSearch,
        total: rows.length,
        page: 1,
        pageSize: rows.length,
        rows
      }));
      if (!csv) return;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-research-all-${researchDateRange}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingResearchStudents(false);
    }
  };

  const renderStudentResearchData = () => {
    const visibleResearchRows = researchStudents?.rows ?? [];
    const researchStudentTotalPages = researchStudents
      ? Math.max(1, Math.ceil(researchStudents.total / researchStudents.pageSize))
      : 1;
    const visibleResearchIds = visibleResearchRows.map((row) => row.user.id);
    const selectedVisibleCount = visibleResearchIds.filter((id) => selectedResearchStudentIds.includes(id)).length;
    const allVisibleSelected = visibleResearchIds.length > 0 && selectedVisibleCount === visibleResearchIds.length;

    return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Student Research Data</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">学生聊天与 AI 使用数据</h3>
              <p className="mt-1 text-xs text-slate-400">按学生姓名、学号、账号或邮箱检索；查看聊天记录、AI 调用和行为事件。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadResearchStudentCsv}
                disabled={isDownloadingResearchStudents || selectedResearchStudentIds.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {isDownloadingResearchStudents ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                下载选中学生 CSV{selectedResearchStudentIds.length ? `（${selectedResearchStudentIds.length}）` : ''}
              </button>
              <button
                type="button"
                onClick={downloadAllResearchStudentsCsv}
                disabled={isDownloadingResearchStudents || !researchStudents?.total}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {isDownloadingResearchStudents ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                下载全部学生 CSV
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={researchStudentSearchDraft}
                onChange={(event) => setResearchStudentSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setResearchStudentPage(1);
                    setResearchStudentSearch(researchStudentSearchDraft.trim());
                  }
                }}
                placeholder="搜索姓名、学号、账号、邮箱"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setResearchStudentPage(1);
                setResearchStudentSearch(researchStudentSearchDraft.trim());
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
            >
              <Search size={16} />
              查询
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="border-b border-slate-100 p-4 xl:border-b-0 xl:border-r">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={visibleResearchIds.length === 0}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedResearchStudentIds((current) => {
                      const currentSet = new Set(current);
                      visibleResearchIds.forEach((id) => {
                        if (checked) currentSet.add(id);
                        else currentSet.delete(id);
                      });
                      return Array.from(currentSet);
                    });
                  }}
                />
                <p className="text-xs font-black text-slate-500">
                  学生列表 {researchStudents ? `(${researchStudents.total})` : ''} · 已选 {selectedResearchStudentIds.length}
                </p>
              </div>
              {isLoadingResearchStudents && <Loader2 className="animate-spin text-indigo-500" size={16} />}
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {visibleResearchRows.map((row) => {
                const profile = row.user.studentProfile ?? {};
                const active = selectedResearchStudentId === row.user.id;
                const selectedForExport = selectedResearchStudentIds.includes(row.user.id);
                return (
                  <div
                    key={row.user.id}
                    onClick={() => setSelectedResearchStudentId(row.user.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelectedResearchStudentId(row.user.id);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedForExport}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleResearchStudentSelection(row.user.id, event.target.checked)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{getResearchStudentName(row)}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {formatValue(profile.studentNo) || row.user.username} · {row.user.anonymousUserCode}
                        </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-indigo-600">
                        {row.stats.messageCount} 消息
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-500">
                      <span className="rounded-lg bg-white px-2 py-1">会话 {row.stats.sessionCount}</span>
                      <span className="rounded-lg bg-white px-2 py-1">AI {row.stats.aiCallCount}</span>
                      <span className="rounded-lg bg-white px-2 py-1">事件 {row.stats.practiceEventCount}</span>
                    </div>
                  </div>
                );
              })}
              {!isLoadingResearchStudents && !(researchStudents?.rows.length) && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                  没有匹配学生
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
              <button
                type="button"
                onClick={() => setResearchStudentPage((current) => Math.max(1, current - 1))}
                disabled={researchStudentPage <= 1 || isLoadingResearchStudents}
                className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                第 {researchStudents?.page ?? researchStudentPage} / {researchStudentTotalPages} 页
              </span>
              <button
                type="button"
                onClick={() => setResearchStudentPage((current) => Math.min(researchStudentTotalPages, current + 1))}
                disabled={researchStudentPage >= researchStudentTotalPages || isLoadingResearchStudents}
                className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>

          <div className="min-w-0 p-6">
            {isLoadingResearchStudentActivity ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-400">
                <Loader2 className="animate-spin text-indigo-500" size={18} />
                正在加载学生活动...
              </div>
            ) : researchStudentActivity ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Selected Student</p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">{getResearchStudentName(researchStudentActivity)}</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      {researchStudentActivity.user.anonymousUserCode} · {formatValue(researchStudentActivity.user.studentProfile?.studentNo) || researchStudentActivity.user.username}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-600">
                    <span className="rounded-xl bg-slate-50 px-3 py-2">消息 {researchStudentActivity.stats.messageCount}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">AI {researchStudentActivity.stats.aiCallCount}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">事件 {researchStudentActivity.stats.practiceEventCount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">最近聊天记录</p>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {researchStudentActivity.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-2xl p-4 ${
                            message.role === 'student'
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-100 bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest opacity-70">
                            <span>{message.role} · turn {message.turnIndex}</span>
                            <span>{new Date(message.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        </div>
                      ))}
                      {researchStudentActivity.messages.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">当前范围暂无聊天记录</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-900 p-4 text-white">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-indigo-200">AI 调用记录</p>
                      <div className="max-h-[240px] space-y-3 overflow-y-auto pr-1">
                        {researchStudentActivity.aiLogs.map((log) => (
                          <div key={log.id} className="rounded-xl bg-white/10 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black">{formatValue(log.provider)} · {formatValue(log.model) || '-'}</p>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${log.degraded ? 'bg-rose-500/20 text-rose-100' : 'bg-emerald-500/20 text-emerald-100'}`}>
                                {log.degraded ? 'fallback' : 'normal'}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-300">{new Date(log.createdAt).toLocaleString()}</p>
                            {log.outputText && <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-100">{log.outputText}</p>}
                          </div>
                        ))}
                        {researchStudentActivity.aiLogs.length === 0 && <p className="text-xs text-slate-400">暂无 AI 调用</p>}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">行为事件</p>
                      <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                        {researchStudentActivity.practiceEvents.map((event) => {
                          const meta = getPracticeEventMeta(event);
                          return (
                            <div key={formatValue(event.id)} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <p className="font-black text-slate-800">{meta.label}</p>
                              <p className="mt-1 leading-5 text-slate-500">{meta.description}</p>
                              <p className="mt-1 font-mono text-[10px] text-slate-300">{formatValue(event.eventType)}</p>
                              <p className="mt-1 text-slate-400">{event.createdAt ? new Date(String(event.createdAt)).toLocaleString() : '-'}</p>
                            </div>
                          );
                        })}
                        {researchStudentActivity.practiceEvents.length === 0 && <p className="text-xs text-slate-400">暂无行为事件</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                请选择一个学生查看研究数据
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
    );
  };

  const renderResearchLab = () => (
    <>
      <div className="flex h-[calc(100vh-8rem)] min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex-none border-b border-slate-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Research Data Chat</p>
              <h4 className="text-base font-black text-slate-900">自然语言数据分析</h4>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setResearchDateRange(range.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                    researchDateRange === range.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
              <button
                onClick={() => setResearchRefreshKey((key) => key + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw size={13} className={isLoadingResearch ? 'animate-spin' : ''} />
                刷新
              </button>
              <button
                onClick={() => void discoverResearchTopics()}
                disabled={topicDiscoveryLoading || researchAiLoading}
                title="基于数据表语义和聚合统计扫描，默认排除管理员、教师、停用账号和明显测试账号。通常需要 10-20 秒。"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {topicDiscoveryLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                扫描科研机会
              </button>
              {researchAiTurns.length > 0 ? (
                <button
                  onClick={() => {
                    setResearchAiTurns([]);
                    setResearchAiContext([]);
                    setResearchAiResult(null);
                    localStorage.removeItem('research_ai_context');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-50"
                >
                  新对话
                </button>
              ) : null}
              {researchAiResult?.rows?.length ? (
                <button
                  onClick={() => {
                    const csv = toCsv(researchAiResult.rows);
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `research-ai-${Date.now()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  导出 CSV
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {AI_QUERY_TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                onClick={() => {
                  setResearchAiQuestion(tpl);
                  void runResearchAiQuery(tpl);
                }}
                disabled={researchAiLoading}
                className="max-w-full rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold leading-3 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        <div ref={researchAiScrollRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-6">
          {topicDiscoveryError ? (
            <div className="mb-5 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold leading-5 text-rose-600">
              <AlertCircle size={15} className="mt-0.5 flex-none" />
              <span>{topicDiscoveryError}</span>
            </div>
          ) : null}
          {topicDiscoveryLoading ? (
            <div className="mb-5 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Loader2 size={18} className="mt-0.5 animate-spin text-indigo-600" />
                <div>
                  <p className="text-sm font-black text-slate-900">正在扫描科研机会</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    系统会先读取数据表说明，再执行聚合统计扫描。扫描默认排除管理员、教师、停用账号，以及用户名或邮箱中包含 test、demo、admin、teacher、测试等标记的账号。
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {topicDiscovery ? (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Topic Discovery</p>
                  <h5 className="mt-1 text-lg font-black text-slate-900">自动科研机会扫描</h5>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{topicDiscovery.overview}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                    扫描口径：仅统计有效学生样本；默认排除管理员、教师、停用账号和明显测试账号。结果用于发现 topic，不直接证明因果关系。
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                  {topicDiscovery.topics.length} 个 topic · {topicDiscovery.durationMs} ms
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {topicDiscovery.topics.map((topic, index) => (
                  <article key={`${topic.title}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic {index + 1}</p>
                        <h6 className="mt-1 text-sm font-black leading-6 text-slate-900">{topic.title}</h6>
                      </div>
                      <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white">
                        {topic.feasibilityScore}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-bold leading-5 text-slate-700">{topic.researchQuestion}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {topic.tables.slice(0, 6).map((table) => (
                        <span key={table} className="rounded-full bg-white px-2 py-1 font-mono text-[10px] font-bold text-indigo-600">
                          {table}
                        </span>
                      ))}
                    </div>
                    <dl className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      <div>
                        <dt className="font-black text-slate-500">核心变量</dt>
                        <dd>{topic.variables.join(' / ') || '-'}</dd>
                      </div>
                      <div>
                        <dt className="font-black text-slate-500">推荐方法</dt>
                        <dd>{topic.method}</dd>
                      </div>
                      <div>
                        <dt className="font-black text-slate-500">样本依据</dt>
                        <dd>{topic.sampleEvidence}</dd>
                      </div>
                      {topic.limitations.length ? (
                        <div>
                          <dt className="font-black text-slate-500">局限</dt>
                          <dd>{topic.limitations.join('；')}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <summary className="cursor-pointer text-xs font-black text-slate-500">下一步 SQL</summary>
                      <pre className="mt-2 max-h-36 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">{topic.nextSql}</pre>
                    </details>
                    <button
                      onClick={() => {
                        const prompt = `继续分析这个科研 topic：${topic.title}。研究问题：${topic.researchQuestion}`;
                        setResearchAiQuestion(prompt);
                        void runResearchAiQuery(prompt);
                      }}
                      disabled={researchAiLoading}
                      className="mt-3 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      继续分析这个 topic
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {researchAiTurns.length === 0 && !researchAiLoading && !topicDiscovery ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <Sparkles size={22} className="mx-auto text-indigo-500" />
              <p className="mt-3 text-sm font-black text-slate-700">输入一个研究问题开始分析</p>
              <p className="mt-1 text-xs text-slate-400">例如：最近 30 天各教学分组活跃人数趋势，或者继续追问“按 HSK 水平拆分”。</p>
            </div>
          ) : (
            <div className="space-y-5">
              {researchAiTurns.map((turn) => (
                <div key={turn.id} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                      {turn.question}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">{turn.result.answer}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1">{turn.result.rowCount} 行结果</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">{turn.result.durationMs} ms</span>
                        {turn.result.chartSuggestion ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">建议图表：{turn.result.chartSuggestion}</span>
                        ) : null}
                        {turn.result.modelDegraded ? (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-600">模型降级</span>
                        ) : null}
                      </div>
                      <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-black text-slate-500">查看 SQL 与结果预览</summary>
                        <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                          {turn.result.sql}
                        </pre>
                        {turn.result.rows.length > 0 ? (() => {
                          const columns = Array.from(new Set<string>(turn.result.rows.flatMap((row) => Object.keys(row)))).slice(0, 6);
                          const previewRows = turn.result.rows.slice(0, 5);
                          return (
                            <div className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white">
                              <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500">
                                  <tr>{columns.map((col) => <th key={col} className="px-3 py-2 text-left font-black">{col}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {previewRows.map((row, idx) => (
                                    <tr key={idx}>
                                      {columns.map((col) => <td key={col} className="px-3 py-2 text-slate-700">{formatCell(row[col])}</td>)}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })() : null}
                      </details>
                      {turn.result.followupPrompts?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {turn.result.followupPrompts.slice(0, 3).map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => {
                                setResearchAiQuestion(prompt);
                                void runResearchAiQuery(prompt);
                              }}
                              disabled={researchAiLoading}
                              className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {researchAiPendingQuestion ? (
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    {researchAiPendingQuestion}
                  </div>
                </div>
              ) : null}
              {researchAiLoading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    正在分析数据...
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex-none border-t border-slate-100 bg-white p-4">
          {researchAiError ? (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-600">
              <AlertCircle size={15} className="mt-0.5 flex-none" />
              <span className="whitespace-pre-wrap break-words">{researchAiError}</span>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 lg:flex-row">
            <textarea
              value={researchAiQuestion}
              onChange={(event) => setResearchAiQuestion(event.target.value)}
              onKeyDown={handleResearchAiKeyDown}
              placeholder="向数据提出问题，例如：近 7 天学生练习事件数量趋势如何？"
              className="min-h-[72px] flex-1 resize-none rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              onClick={() => void runResearchAiQuery()}
              disabled={researchAiLoading || !researchAiQuestion.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50 lg:w-32"
            >
              <Sparkles size={16} className={researchAiLoading ? 'animate-pulse' : ''} />
              发送
            </button>
          </div>
        </div>
      </div>

      <div className="hidden">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI SQL Copilot</p>
            <h4 className="text-lg font-black text-slate-900 mt-1">自然语言查库（M1）</h4>
        <div className="hidden">
          <div className="flex flex-wrap gap-2">
            {AI_QUERY_TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                onClick={() => setResearchAiQuestion(tpl)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                {tpl}
              </button>
            ))}
          </div>
          <textarea
            value={researchAiQuestion}
            onChange={(event) => setResearchAiQuestion(event.target.value)}
            onKeyDown={handleResearchAiKeyDown}
            placeholder="例如：近30天按分组统计活跃学生数，并按日期升序"
            className="min-h-[100px] w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => runResearchAiQuery()}
              disabled={researchAiLoading || !researchAiQuestion.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Sparkles size={14} className={researchAiLoading ? 'animate-pulse' : ''} /> 运行 AI 分析
            </button>
            {researchAiResult?.rows?.length ? (
              <button
                onClick={() => {
                  const csv = toCsv(researchAiResult.rows);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `research-ai-${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                导出 CSV
              </button>
            ) : null}
            {researchAiError && <span className="text-xs text-rose-500">{researchAiError}</span>}
          </div>
          {researchAiHistory.length > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最近查询</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {researchAiHistory.slice(0, 5).map((item) => (
                  <button
                    key={`${item.ts}-${item.question}`}
                    onClick={() => setResearchAiQuestion(item.question)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-white"
                    title={`${item.rowCount} rows`}
                  >
                    {item.question.slice(0, 24)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {researchAiContext.length > 0 && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">多轮上下文（M3）</p>
                <button
                  onClick={() => {
                    setResearchAiContext([]);
                    localStorage.removeItem('research_ai_context');
                  }}
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700"
                >
                  清空
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {researchAiContext.slice(-3).map((item, idx) => (
                  <div key={`${item.question}-${idx}`} className="rounded-lg bg-white border border-indigo-100 p-2">
                    <p className="text-[11px] font-bold text-slate-700">Q: {item.question}</p>
                    <p className="text-[11px] text-slate-500 mt-1">A: {item.answer.slice(0, 90)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {researchAiResult && (
          <>
          <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI 结论</p>
              <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{researchAiResult.answer}</p>
              {researchAiResult.sqlRisk ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    SQL 风险等级：{researchAiResult.sqlRisk.level}
                  </p>
                  {researchAiResult.sqlRisk.items.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-700 space-y-0.5">
                      {researchAiResult.sqlRisk.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] text-emerald-700">已通过基础风险检查</p>
                  )}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">图表建议</span>
                <span className="rounded-md bg-indigo-100 px-2 py-1 text-[11px] font-bold text-indigo-700">
                  {researchAiResult.chartSuggestion || 'table'}
                </span>
              </div>
              {researchAiResult.followupPrompts?.length ? (
                <div className="mt-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">推荐追问</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {researchAiResult.followupPrompts.map((prompt, idx) => (
                      <button
                        key={`${prompt}-${idx}`}
                        onClick={() => {
                          setResearchAiQuestion(prompt);
                          void runResearchAiQuery(prompt);
                        }}
                        className="rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] text-indigo-700 hover:bg-indigo-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {researchAiResult.chartSuggestion !== 'table' && (() => {
                const chartData = buildResearchChartData(researchAiResult.rows);
                if (!chartData.length) return null;
                const max = Math.max(...chartData.map((d) => d.value), 1);
                return (
                  <div className="mt-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">图表预览（M4）</p>
                    <div className="mt-2 space-y-1">
                      {chartData.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="w-20 truncate text-[11px] text-slate-500">{item.label}</span>
                          <div className="h-2 flex-1 rounded bg-indigo-100 overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
                          </div>
                          <span className="w-10 text-right text-[11px] text-slate-600">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <p className="mt-2 text-xs text-slate-400">行数 {researchAiResult.rowCount} · {researchAiResult.durationMs}ms</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">本次结果是否有帮助？</span>
                <button
                  onClick={() => {
                    const key = `${researchAiResult.question}__${researchAiResult.sql}`;
                    const next = { ...researchAiFeedback, [key]: 'up' as const };
                    setResearchAiFeedback(next);
                    localStorage.setItem('research_ai_feedback', JSON.stringify(next));
                  }}
                  className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-700"
                >
                  👍 有帮助
                </button>
                <button
                  onClick={() => {
                    const key = `${researchAiResult.question}__${researchAiResult.sql}`;
                    const next = { ...researchAiFeedback, [key]: 'down' as const };
                    setResearchAiFeedback(next);
                    localStorage.setItem('research_ai_feedback', JSON.stringify(next));
                  }}
                  className="rounded border border-rose-200 px-2 py-0.5 text-[10px] text-rose-700"
                >
                  👎 待改进
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">SQL</p>
                <button
                  onClick={() => navigator.clipboard.writeText(researchAiResult.sql)}
                  className="rounded border border-indigo-300/40 px-2 py-1 text-[10px] text-indigo-100 hover:bg-white/10"
                >
                  复制 SQL
                </button>
              </div>
              <pre className="mt-2 text-xs leading-6 text-slate-100 overflow-auto max-h-[220px]">{researchAiResult.sql}</pre>
            </div>
          </div>

          {researchAiResult.rows.length > 0 && (() => {
            const columns = Array.from(new Set<string>(researchAiResult.rows.flatMap((row) => Object.keys(row))));
            const normalizedFilter = researchAiFilterText.trim().toLowerCase();
            const filteredRows = normalizedFilter
              ? researchAiResult.rows.filter((row) =>
                  columns.some((col) => String(row[col] ?? '').toLowerCase().includes(normalizedFilter))
                )
              : researchAiResult.rows;
            const sortedRows = [...filteredRows].sort((a, b) => {
              if (!researchAiSortColumn) return 0;
              const av = String(a[researchAiSortColumn] ?? '');
              const bv = String(b[researchAiSortColumn] ?? '');
              const compare = av.localeCompare(bv, 'zh-CN', { numeric: true });
              return researchAiSortDirection === 'asc' ? compare : -compare;
            });
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
            const currentPage = Math.min(researchAiPage, totalPages);
            const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
            return (
              <div className="mt-4 rounded-2xl border border-slate-100 overflow-auto">
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <input
                    value={researchAiFilterText}
                    onChange={(event) => {
                      setResearchAiFilterText(event.target.value);
                      setResearchAiPage(1);
                    }}
                    placeholder="筛选当前结果（包含匹配）"
                    className="w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>排序列</span>
                    <select
                      value={researchAiSortColumn}
                      onChange={(event) => setResearchAiSortColumn(event.target.value)}
                      className="rounded border border-slate-200 px-2 py-1"
                    >
                      <option value="">无</option>
                      {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                    </select>
                    <button onClick={() => setResearchAiSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))} className="rounded border border-slate-200 px-2 py-1">
                      {researchAiSortDirection === 'asc' ? '升序' : '降序'}
                    </button>
                  </div>
                </div>
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>{columns.map((col) => <th key={col} className="px-3 py-2 text-left">{col}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => <td key={col} className="px-3 py-2 text-slate-700">{formatCell(row[col])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">第 {currentPage}/{totalPages} 页，每页 {pageSize} 条</span>
                  <div className="flex gap-2">
                    <button onClick={() => setResearchAiPage((p) => Math.max(1, p - 1))} className="px-2 py-1 text-xs rounded border">上一页</button>
                    <button onClick={() => setResearchAiPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 text-xs rounded border">下一页</button>
                  </div>
                </div>
              </div>
            );
          })()}
          </>
        )}
      </div>

      {isLoadingResearch && !researchOverview && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-slate-400 flex items-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
          正在加载研究数据...
        </div>
      )}

      {researchOverview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              ['学生数', researchOverview.metrics.studentCount, 'student users'],
              ['实训会话', researchOverview.metrics.sessionCount, 'simulation sessions'],
              ['学生消息', researchOverview.metrics.studentMessageCount, `${researchOverview.metrics.messageCount} total messages`],
              ['AI 调用', researchOverview.metrics.aiCallCount, `fallback ${researchOverview.metrics.degradedAiCallCount}`],
              ['分析结果', researchOverview.metrics.analysisCount, `${researchOverview.metrics.practiceEventCount} practice events`]
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black text-slate-900">{value}</span>
                  <BarChart3 size={18} className="text-indigo-400" />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-400">{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Stage Breakdown</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">阶段分布</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">阶段</th>
                      <th className="px-5 py-3 text-right">会话</th>
                      <th className="px-5 py-3 text-right">AI 调用</th>
                      <th className="px-5 py-3 text-right">fallback</th>
                      <th className="px-5 py-3 text-right">均分</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {researchOverview.stageBreakdown.map((stage) => (
                      <tr key={stage.stageId} className="text-slate-600">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-800">{stage.titleZh}</p>
                          <p className="mt-1 text-xs text-slate-400">{stage.key}</p>
                        </td>
                        <td className="px-5 py-4 text-right font-bold">{stage.sessionCount}</td>
                        <td className="px-5 py-4 text-right font-bold">{stage.aiCallCount}</td>
                        <td className="px-5 py-4 text-right font-bold">{stage.degradedRate}%</td>
                        <td className="px-5 py-4 text-right font-bold">{stage.averageScore ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-slate-900 rounded-3xl shadow-sm p-6 text-white">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Idea Builder</p>
              <h3 className="text-xl font-black mt-1">选题线索</h3>
              <div className="mt-5 space-y-4">
                {researchOverview.researchIdeas.map((idea) => (
                  <article key={idea.title} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm font-black text-white">{idea.title}</p>
                    <p className="mt-2 text-xs leading-5 text-indigo-100">{idea.question}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-300">{idea.data}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{idea.method}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Dataset Preview</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">匿名化样本预览</h3>
              </div>
              <p className="text-xs font-bold text-slate-400">
                generated {new Date(researchOverview.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left">匿名编号</th>
                    <th className="px-5 py-3 text-left">阶段</th>
                    <th className="px-5 py-3 text-left">学生消息</th>
                    <th className="px-5 py-3 text-right">得分</th>
                    <th className="px-5 py-3 text-left">研究变量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {researchOverview.datasetPreview.map((row) => (
                    <tr key={row.messageId} className="text-slate-600 align-top">
                      <td className="px-5 py-4 font-mono text-xs font-bold">{row.anonymousUserCode}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{row.stageTitle}</p>
                        <p className="mt-1 text-xs text-slate-400">turn {row.turnIndex}</p>
                      </td>
                      <td className="px-5 py-4 max-w-xl">
                        <p className="line-clamp-3 leading-6">{row.studentMessage}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-bold">{row.score ?? '-'}</td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        <p>HSK: {row.hskLevel || '-'}</p>
                        <p>国籍: {row.nationality || '-'}</p>
                        <p>专业: {row.major || '-'}</p>
                      </td>
                    </tr>
                  ))}
                  {researchOverview.datasetPreview.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-slate-400" colSpan={5}>
                        当前范围内暂无可分析样本
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      </div>
    </>
  );

  const renderSystemData = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {overview?.cards.map((card) => (
          <div key={card.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-3xl font-black text-slate-900">{card.value}</span>
              <Database size={18} className="text-indigo-400" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-400">{card.detail}</p>
          </div>
        ))}
        {!overview && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-sm text-slate-400 flex items-center gap-3">
            <Loader2 className={isLoadingOverview ? 'animate-spin text-indigo-500' : 'text-slate-300'} size={18} />
            正在加载系统总览...
          </div>
        )}
      </div>

      {overview && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Runtime</p>
            <h3 className="mt-1 text-sm font-black text-slate-800">
              {overview.ai.provider} · {overview.ai.model ?? '未指定模型'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {overview.ai.enabled ? 'AI 已启用' : 'AI 已关闭'} · {overview.ai.hasKey ? 'key 已注入' : 'key 未注入'} · {overview.ai.proxyConfigured ? '代理已配置' : '未配置代理'}
            </p>
          </div>
          <button
            onClick={() => {
              setOverviewRefreshKey((key) => key + 1);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
          >
            刷新总览
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="max-h-96 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)] xl:self-start">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Tables</p>
            <h3 className="text-lg font-black text-slate-800">数据库表</h3>
          </div>
          {isLoadingTables && <Loader2 className="animate-spin text-indigo-500" size={18} />}
        </div>

        <div className="space-y-5">
          {Object.entries(tableGroups).map(([group, tables]) => (
            <div key={group} className="space-y-2">
              <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group}</p>
              {(tables as AdminTableMeta[]).map((table) => (
                <button
                  key={table.key}
                  onClick={() => switchTable(table.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    selectedTable === table.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block">{table.label}</span>
                  <span className={`block mt-1 font-mono text-[10px] ${selectedTable === table.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {table.key}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <section className="space-y-6 min-w-0">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{tableData?.table.key ?? selectedTable}</p>
              <h3 className="text-xl font-black text-slate-800">{tableData?.table.label ?? '选择数据表'}</h3>
              <p className="text-xs text-slate-400 mt-1">只读查看，用于开发排查和管理员总览。</p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitSearch();
                  }}
                  placeholder="搜索当前表"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:w-56"
                />
              </div>
              <select
                value={statusField}
                onChange={(event) => {
                  setStatusField(event.target.value);
                  setStatusValue('');
                  setTablePage(1);
                }}
                className="w-[calc(50%-0.25rem)] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:w-32"
              >
                <option value="">状态字段</option>
                {(selectedTableMeta?.statusFields ?? []).map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
              <select
                value={statusValue}
                disabled={!statusField}
                onChange={(event) => {
                  setStatusValue(event.target.value);
                  setTablePage(1);
                }}
                className="w-[calc(50%-0.25rem)] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none disabled:opacity-40 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:w-32"
              >
                <option value="">全部状态</option>
                {currentStatusValues.map((value) => (
                  <option key={formatValue(value)} value={formatValue(value)}>
                    {formatValue(value)}
                  </option>
                ))}
              </select>
              <select
                value={dateField}
                onChange={(event) => {
                  setDateField(event.target.value);
                  setTablePage(1);
                }}
                className="w-[calc(50%-0.25rem)] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:w-32"
              >
                <option value="">时间字段</option>
                {(selectedTableMeta?.dateFields ?? []).map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
              <select
                value={dateRange}
                disabled={!dateField}
                onChange={(event) => {
                  setDateRange(event.target.value as (typeof DATE_RANGES)[number]['value']);
                  setTablePage(1);
                }}
                className="w-[calc(50%-0.25rem)] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none disabled:opacity-40 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 sm:w-32"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
              <button onClick={submitSearch} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
                搜索
              </button>
              <button
                onClick={() => {
                  setSearchDraft('');
                  setSearchTerm('');
                  setStatusField('');
                  setStatusValue('');
                  setDateField('');
                  setDateRange('all');
                  setTablePage(1);
                  setRowsRefreshKey((key) => key + 1);
                }}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="刷新"
              >
                <RefreshCw size={16} className={isLoadingRows ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {adminError && (
            <div className="m-6 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              <AlertCircle size={18} /> {adminError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingRows ? (
                  <tr>
                    <td colSpan={Math.max(1, visibleColumns.length)} className="px-5 py-16 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-3 animate-spin text-indigo-500" size={24} />
                      正在加载记录...
                    </td>
                  </tr>
                ) : tableData?.rows.length ? (
                  tableData.rows.map((row, index) => (
                    <tr
                      key={`${tableData.table.key}-${index}-${formatValue(row[tableData.table.idField ?? 'id'])}`}
                      onClick={() => setSelectedRow(row)}
                      className={`cursor-pointer transition-colors ${selectedRow === row ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                    >
                      {visibleColumns.map((column) => (
                        <td key={column} className="px-5 py-4 align-top text-xs text-slate-600 max-w-[260px]">
                          <span className="line-clamp-2 break-all">{formatCell(row[column])}</span>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(1, visibleColumns.length)} className="px-5 py-16 text-center text-sm text-slate-400">
                      暂无记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>共 {tableData?.total ?? 0} 条，当前第 {tablePage} / {totalPages} 页</span>
            <div className="flex items-center gap-2">
              <button
                disabled={tablePage <= 1}
                onClick={() => setTablePage((page) => Math.max(1, page - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                上一页
              </button>
              <button
                disabled={tablePage >= totalPages}
                onClick={() => setTablePage((page) => Math.min(totalPages, page + 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                下一页
              </button>
            </div>
          </div>
        </div>

        {selectedTable === 'simulation_sessions' && selectedRow ? (
          renderSessionSummary()
        ) : ['users', 'student_profile', 'student_auth'].includes(selectedTable) && selectedRow ? (
          renderStudentSummary()
        ) : selectedTable === 'ai_interaction_logs' && selectedRow ? (
          renderAiLogSummary()
        ) : (
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Selected Record</p>
                <h3 className="text-lg font-black">记录详情</h3>
              </div>
              <Database size={20} className="text-indigo-300" />
            </div>
            <pre className="max-h-[360px] overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-100">
              {selectedRow ? JSON.stringify(selectedRow, null, 2) : '请选择一条记录'}
            </pre>
          </div>
        )}
      </section>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="fixed inset-y-0 z-50 hidden w-64 flex-col bg-slate-900 text-white shadow-2xl lg:flex">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
            <Settings2 size={24} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">系统管理后台</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {visibleNavItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} /> 安全退出登录
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-40 flex min-h-20 flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{headerUserLabel}</span>
              <span>·</span>
              <span>当前角色：{currentRoleText}</span>
              <span>·</span>
              <span>系统就绪</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canAccessPanel('system_admin') && (
              <Link
                to="/admin/system"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Settings2 size={16} />
                系统管理
              </Link>
            )}
            {canAccessPanel('prompt') && activeTab === 'PROMPT' && (
              <button
                onClick={openNewScenario}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs"
              >
                <Plus size={16} /> 新增模板/资源
              </button>
            )}
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          {visibleNavItems.map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => setActiveTab(item.tab)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${
                activeTab === item.tab
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {item.mobileLabel}
            </button>
          ))}
        </nav>

        <div className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 lg:px-5 lg:py-8 xl:px-6">
          {activeTab === 'USERS' && renderUserManagement()}
          {canAccessPanel('prompt') && activeTab === 'PROMPT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(isLoadingScenarios || scenarioError) && (
                <div className={`md:col-span-2 lg:col-span-3 rounded-2xl border px-5 py-4 text-sm font-semibold ${
                  scenarioError ? 'border-red-200 bg-red-50 text-red-700' : 'border-indigo-100 bg-indigo-50 text-indigo-700'
                }`}>
                  {scenarioError || '正在加载提示词模板...'}
                </div>
              )}
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      Stage {scenario.stage}
                    </span>
                    {scenario.isDefault && <Lock size={14} className="text-slate-300" />}
                  </div>

                  <h3 className="font-bold text-slate-800 mb-2 leading-tight flex-1">{scenario.name}</h3>
                  <p className="text-xs font-semibold text-slate-400">{scenario.opponentName || '未设置对手'} / {scenario.opponentRole || '未设置角色'}</p>

                  <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-50">
                    <button onClick={() => openScenarioEditor(scenario)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                      <Edit3 size={14} /> 编辑
                    </button>
                    <button onClick={() => handleClone(scenario)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all">
                      <Copy size={14} /> 复制模板
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={openNewScenario} className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-4 hover:bg-white hover:border-indigo-300 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:shadow-lg transition-all">
                  <Plus size={24} />
                </div>
                <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600">添加新教学场景</span>
              </button>
            </div>
          )}

          {canAccessPanel('resources') && activeTab === 'RESOURCES' && <TeachingResourceManager />}
          {canAccessPanel('groups') && activeTab === 'GROUPS' && <TeachingGroupManager />}
          {canAccessPanel('student_research') && activeTab === 'STUDENT_RESEARCH' && renderStudentResearchData()}
          {canAccessPanel('research_ai') && activeTab === 'RECORDS' && renderResearchLab()}
          {canAccessPanel('click_flow') && activeTab === 'CLICK_FLOW' && renderClickFlow()}
          {canAccessPanel('system_data') && activeTab === 'SYSTEM_DATA' && renderSystemData()}
          {activeTab === 'ACCOUNT' && renderAccountSettings()}

          {(isAddingNew || selectedScenarioId) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="bg-indigo-600 p-8 text-white flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{isAddingNew ? '新建提示词模板' : '编辑场景逻辑'}</h3>
                    <p className="text-indigo-100 text-xs mt-1 opacity-80">定义 AI 对手行为、复盘规则与教练逻辑</p>
                  </div>
                  <button onClick={() => { setIsAddingNew(false); setSelectedScenarioId(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="max-h-[70vh] space-y-8 overflow-y-auto p-5 sm:p-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">场景名称</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-indigo-50 outline-none"
                      placeholder="例如：6. 报关阶段：单证审核实务"
                      value={scenarioForm.name}
                      onChange={(event) => setScenarioForm({ ...scenarioForm, name: event.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">所属阶段</label>
                      <select
                        value={scenarioForm.stageId}
                        onChange={(event) => setScenarioForm({ ...scenarioForm, stageId: event.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-indigo-50 outline-none"
                      >
                        <option value="">请选择阶段</option>
                        {scenarioStages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.sortOrder}. {stage.titleZh}{stage.titleEn ? ` (${stage.titleEn})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Prompt 版本</label>
                      <input
                        type="text"
                        value={scenarioForm.promptVersion}
                        onChange={(event) => setScenarioForm({ ...scenarioForm, promptVersion: event.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-indigo-50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">采购经理姓名</label>
                      <input
                        type="text"
                        value={scenarioForm.opponentName}
                        onChange={(event) => setScenarioForm({ ...scenarioForm, opponentName: event.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-indigo-50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">角色/职位</label>
                      <input
                        type="text"
                        value={scenarioForm.opponentRole}
                        onChange={(event) => setScenarioForm({ ...scenarioForm, opponentRole: event.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-indigo-50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">AI 角色与对话提示词 (Prompts)</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-indigo-50 outline-none h-48 leading-relaxed"
                      placeholder="描述 AI 角色性格、博弈目标及对话约束..."
                      value={scenarioForm.systemPrompt}
                      onChange={(event) => setScenarioForm({ ...scenarioForm, systemPrompt: event.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={scenarioForm.isDefault}
                        onChange={(event) => setScenarioForm({ ...scenarioForm, isDefault: event.target.checked })}
                      />
                      默认启用
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={scenarioForm.isActive}
                        onChange={(event) => setScenarioForm({ ...scenarioForm, isActive: event.target.checked })}
                      />
                      可用
                    </label>
                    <input
                      type="text"
                      value={scenarioForm.difficulty}
                      onChange={(event) => setScenarioForm({ ...scenarioForm, difficulty: event.target.value })}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 outline-none"
                      placeholder="difficulty"
                    />
                  </div>
                </div>

                <div className="p-8 border-t border-slate-100 flex gap-4">
                  <button onClick={() => { setIsAddingNew(false); setSelectedScenarioId(null); }} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all">
                    取消
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {isSaving ? '正在部署模板...' : '发布并更新场景'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
