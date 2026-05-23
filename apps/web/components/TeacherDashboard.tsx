import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Code2,
  Copy,
  Database,
  Edit3,
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

type TeacherTab = 'USERS' | 'RESOURCES' | 'GROUPS' | 'RECORDS' | 'CLICK_FLOW' | 'PROMPT' | 'SYSTEM_DATA' | 'ACCOUNT';

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
  rows: Array<Record<string, unknown> & {
    id: string;
    eventType: string;
    sessionId?: string | null;
    stageId?: string | null;
    resourceId?: string | null;
    metadataJson?: unknown;
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

type ManagedRoleKey = 'student' | 'teacher' | 'admin';

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

type UserManagerResponse = {
  users: ManagedUser[];
  roles: Array<{ key: ManagedRoleKey; name: string }>;
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

const PAGE_SIZE = 25;

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

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const columns = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));

  const esc = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = columns.map(esc).join(',');
  const body = rows.map((row) => columns.map((col) => esc(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
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

const ROLE_LABELS: Record<ManagedRoleKey, string> = {
  admin: '系统管理员',
  teacher: '教师',
  student: '学生'
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
  const [activeTab, setActiveTab] = useState<TeacherTab>(isAdmin ? 'PROMPT' : 'RESOURCES');
  const [userManager, setUserManager] = useState<UserManagerResponse | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userManagerError, setUserManagerError] = useState('');
  const [userManagerMessage, setUserManagerMessage] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState<ManagedUserForm>({
    username: '',
    email: '',
    password: '',
    status: 'ACTIVE',
    roleKeys: ['teacher']
  });
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
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
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

  const [researchAiQuestion, setResearchAiQuestion] = useState('最近30天各教学分组活跃人数趋势');
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
  const [researchAiFeedback, setResearchAiFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const researchAiScrollRef = useRef<HTMLDivElement | null>(null);

  const [legacyScenarios] = useState([
    { id: 1, name: '1. 获客阶段：商务礼仪与名片交换', stage: 1, type: 'Built-in', active: true, prompt: '你是一个严格的采购经理...' },
    { id: 2, name: '2. 报价阶段：术语 FOB/CIF 详解', stage: 2, type: 'Built-in', active: true, prompt: '重点考察 FOB 术语理解...' },
    { id: 3, name: '3. 磋商阶段：价格异议处理策略', stage: 3, type: 'Built-in', active: true, prompt: '针对价格分歧进行极限施压...' },
    { id: 4, name: '4. 合同阶段：法律术语与风险规避', stage: 4, type: 'Built-in', active: true, prompt: '法律严密性审核...' },
    { id: 5, name: '5. 备货阶段：生产进度与质量监控', stage: 5, type: 'Draft', active: false, prompt: '' }
  ]);
  const [scenarios, setScenarios] = useState<PromptScenario[]>([]);

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
    if (!isAdmin) return;
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
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== 'PROMPT' || !isAdmin) return;
    void loadScenarios();
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (activeTab === 'USERS' || activeTab === 'PROMPT' || activeTab === 'SYSTEM_DATA') {
      setActiveTab('RESOURCES');
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !isAdmin || adminTables.length > 0) return;

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
  }, [activeTab, isAdmin, adminTables.length, selectedTable]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !isAdmin) return;

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
  }, [activeTab, isAdmin, overviewRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'RECORDS') return;

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
    if (activeTab !== 'CLICK_FLOW') return;

    let ignore = false;
    setIsLoadingClickFlow(true);
    setAdminError('');

    const buildQuery = (eventType: 'all' | 'ui_click' | 'page_view') => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: eventType === 'all' ? '50' : '100',
        dateField: 'createdAt',
        dateRange: clickFlowDateRange
      });

      if (eventType !== 'all') {
        params.set('statusField', 'eventType');
        params.set('status', eventType);
      }

      return `/api/admin/tables/practice_events?${params.toString()}`;
    };

    Promise.all([
      apiRequest<AdminTableListResponse>(buildQuery(clickFlowEventType)),
      apiRequest<AdminTableListResponse>(buildQuery('ui_click')),
      apiRequest<AdminTableListResponse>(buildQuery('page_view'))
    ])
      .then(([rowsResponse, clickResponse, viewResponse]) => {
        if (ignore) return;

        setClickFlowSummary({
          generatedAt: new Date().toISOString(),
          total: rowsResponse.total,
          uiClickCount: clickResponse.total,
          pageViewCount: viewResponse.total,
          rows: rowsResponse.rows as ClickFlowSummary['rows']
        });
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
  }, [activeTab, clickFlowDateRange, clickFlowEventType]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !isAdmin || !selectedTable) return;

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
  }, [activeTab, isAdmin, selectedTable, tablePage, searchTerm, statusField, statusValue, dateField, dateRange, rowsRefreshKey]);

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

  const setNewUserRole = (role: ManagedRoleKey, checked: boolean) => {
    setNewUserForm((current) => {
      const nextRoles = new Set(current.roleKeys);
      if (checked) {
        nextRoles.add(role);
      } else {
        nextRoles.delete(role);
      }
      if (role === 'admin' && checked) nextRoles.add('teacher');
      return { ...current, roleKeys: Array.from(nextRoles) as ManagedRoleKey[] };
    });
  };

  const createManagedUser = async () => {
    setUserManagerError('');
    setUserManagerMessage('');
    if (!newUserForm.username.trim() || !newUserForm.password) {
      setUserManagerError('请填写用户名和初始密码');
      return;
    }
    if (newUserForm.roleKeys.length === 0) {
      setUserManagerError('请至少选择一个角色');
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
      setNewUserForm({ username: '', email: '', password: '', status: 'ACTIVE', roleKeys: ['teacher'] });
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

  const toggleManagedUserRole = (targetUser: ManagedUser, role: ManagedRoleKey, checked: boolean) => {
    const nextRoles = new Set(targetUser.roles);
    if (checked) {
      nextRoles.add(role);
    } else {
      nextRoles.delete(role);
    }
    if (role === 'admin' && checked) nextRoles.add('teacher');
    updateManagedUserDraft(targetUser.id, { roles: Array.from(nextRoles) as ManagedRoleKey[] });
  };

  const saveManagedUser = async (targetUser: ManagedUser) => {
    setUserManagerError('');
    setUserManagerMessage('');
    if (!targetUser.username.trim()) {
      setUserManagerError('用户名不能为空');
      return;
    }
    if (targetUser.roles.length === 0) {
      setUserManagerError('请至少保留一个角色');
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

  const pageTitle =
    activeTab === 'ACCOUNT'
      ? '账户设置'
      : activeTab === 'USERS'
      ? '用户管理'
      : activeTab === 'PROMPT'
      ? '提示词 (Prompt) 模板管理'
      : activeTab === 'RESOURCES'
        ? '教学资源管理'
        : activeTab === 'GROUPS'
          ? '分组管理'
          : activeTab === 'SYSTEM_DATA'
            ? '系统数据查看'
            : '研究分析工作台';

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
    if (!isAdmin) {
      return (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
          当前账号没有系统管理员权限，无法管理用户。
        </div>
      );
    }

    const users = userManager?.users ?? [];

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
              <p className="text-sm text-slate-500">管理员账号会自动同时拥有教师角色，以便登录现有后台。</p>
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
            <div className="flex flex-wrap gap-3">
              {(Object.keys(ROLE_LABELS) as ManagedRoleKey[]).map((role) => (
                <label key={role} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={newUserForm.roleKeys.includes(role)}
                    onChange={(e) => setNewUserRole(role, e.target.checked)}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
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

        <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">用户列表</h3>
              <p className="text-sm text-slate-500">可修改状态、角色和重置密码。密码哈希不会在前端展示。</p>
            </div>
            <button
              type="button"
              onClick={loadUserManager}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} /> 刷新
            </button>
          </div>

          {isLoadingUsers && !userManager ? (
            <div className="flex items-center gap-3 p-6 text-sm font-semibold text-slate-500">
              <Loader2 className="animate-spin text-indigo-500" size={18} />
              正在加载用户...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-4">用户</th>
                    <th className="px-5 py-4">邮箱</th>
                    <th className="px-5 py-4">状态</th>
                    <th className="px-5 py-4">角色</th>
                    <th className="px-5 py-4">创建时间</th>
                    <th className="px-5 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((item) => {
                    const isSelf = item.id === userManager?.currentUserId;
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-5 py-4">
                          <input
                            value={item.username}
                            onChange={(e) => updateManagedUserDraft(item.id, { username: e.target.value })}
                            className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
                          />
                          {isSelf && <p className="mt-1 text-xs font-bold text-indigo-600">当前账号</p>}
                        </td>
                        <td className="px-5 py-4">
                          <input
                            value={item.email ?? ''}
                            onChange={(e) => updateManagedUserDraft(item.id, { email: e.target.value })}
                            className="w-52 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={item.status}
                            onChange={(e) => updateManagedUserDraft(item.id, { status: e.target.value as ManagedUser['status'] })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                          >
                            {USER_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(ROLE_LABELS) as ManagedRoleKey[]).map((role) => (
                              <label key={role} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={item.roles.includes(role)}
                                  onChange={(e) => toggleManagedUserRole(item, role, e.target.checked)}
                                />
                                {ROLE_LABELS[role]}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => resetManagedUserPassword(item)}
                              disabled={savingUserId === item.id}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            >
                              重置密码
                            </button>
                            <button
                              type="button"
                              onClick={() => saveManagedUser(item)}
                              disabled={savingUserId === item.id}
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              {savingUserId === item.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                              保存
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['总事件', clickFlowSummary.total, 'practice_events'],
            ['点击事件', clickFlowSummary.uiClickCount, 'ui_click'],
            ['页面浏览', clickFlowSummary.pageViewCount, 'page_view']
          ].map(([label, value, detail]) => (
            <div key={String(label)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-3xl font-black text-slate-900">{value}</span>
                <MousePointerClick size={18} className="text-indigo-400" />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-400">{detail}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Click Flow</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">最近点击流</h3>
              <p className="mt-1 text-xs text-slate-400">
                generated {new Date(clickFlowSummary.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                  {type}
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

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">时间</th>
                  <th className="px-5 py-3 text-left">事件</th>
                  <th className="px-5 py-3 text-left">用户</th>
                  <th className="px-5 py-3 text-left">页面</th>
                  <th className="px-5 py-3 text-left">标签</th>
                  <th className="px-5 py-3 text-left">目标</th>
                  <th className="px-5 py-3 text-left">阶段</th>
                  <th className="px-5 py-3 text-left">会话</th>
                  <th className="px-5 py-3 text-left">附加信息</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const metadata = row.metadataJson && typeof row.metadataJson === 'object' ? (row.metadataJson as Record<string, unknown>) : {};
                  return (
                    <tr key={row.id} className="text-slate-600 align-top">
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600">
                          {row.eventType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono">{formatValue(row.userId) || '-'}</td>
                      <td className="px-5 py-4 text-xs">{formatValue(metadata.page) || '-'}</td>
                      <td className="px-5 py-4 text-xs">{formatValue(metadata.label) || '-'}</td>
                      <td className="px-5 py-4 text-xs">{formatValue(metadata.target) || '-'}</td>
                      <td className="px-5 py-4 text-xs">{formatValue(metadata.stage) || '-'}</td>
                      <td className="px-5 py-4 text-xs font-mono">{formatValue(row.sessionId) || '-'}</td>
                      <td className="px-5 py-4 max-w-md text-xs text-slate-500">
                        <p className="line-clamp-3 whitespace-pre-wrap">{formatCell(row.metadataJson)}</p>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-400" colSpan={9}>
                      当前筛选条件下暂无点击流
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            ['身份', user.role || '教师']
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
      setResearchAiLoading(false);
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
  }, [researchAiTurns.length, researchAiLoading, researchAiError]);

  const handleResearchAiKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!researchAiLoading && researchAiQuestion.trim()) {
      void runResearchAiQuery();
    }
  };

  const renderResearchLab = () => (
    <div className="flex h-[calc(100vh-10rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex-none bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Research Lab</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">研究分析工作台</h3>
            <p className="text-sm text-slate-400 mt-2">
              基于学生与 AI 实训数据生成研究指标、选题线索和匿名化样本预览。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setResearchDateRange(range.value)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition ${
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw size={14} className={isLoadingResearch ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-none border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Research Data Chat</p>
              <h4 className="mt-1 text-xl font-black text-slate-900">自然语言数据分析</h4>
              <p className="mt-2 text-sm text-slate-500">
                以多轮对话方式分析学生实训数据，系统会生成只读 SQL 并返回结论、表格和后续研究问题。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {researchAiTurns.length > 0 ? (
                <button
                  onClick={() => {
                    setResearchAiTurns([]);
                    setResearchAiContext([]);
                    setResearchAiResult(null);
                    localStorage.removeItem('research_ai_context');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  导出 CSV
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {AI_QUERY_TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                onClick={() => {
                  setResearchAiQuestion(tpl);
                  void runResearchAiQuery(tpl);
                }}
                disabled={researchAiLoading}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        <div ref={researchAiScrollRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-6">
          {researchAiTurns.length === 0 ? (
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
                          const columns = Array.from(new Set(turn.result.rows.flatMap((row) => Object.keys(row)))).slice(0, 6);
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
            const columns = Array.from(new Set(researchAiResult.rows.flatMap((row) => Object.keys(row))));
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
    </div>
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
          <h1 className="font-bold text-lg tracking-tight">教师管理后台</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {isAdmin && (
            <button onClick={() => setActiveTab('USERS')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <ShieldCheck size={18} /> 2.0 用户管理
            </button>
          )}
          <button onClick={() => setActiveTab('RESOURCES')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'RESOURCES' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BookOpen size={18} /> 2.1 教学资源管理
          </button>
          <button onClick={() => setActiveTab('GROUPS')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'GROUPS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Group size={18} /> 2.2 分组管理
          </button>
          <button onClick={() => setActiveTab('RECORDS')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'RECORDS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BarChart3 size={18} /> 2.3 研究分析工作台
          </button>
          <button onClick={() => setActiveTab('CLICK_FLOW')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'CLICK_FLOW' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <MousePointerClick size={18} /> 点击流分区
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setActiveTab('PROMPT')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'PROMPT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <Code2 size={18} /> 2.4 提示词工程管理
              </button>
              <button onClick={() => setActiveTab('SYSTEM_DATA')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'SYSTEM_DATA' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <Database size={18} /> 2.5 系统数据
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('ACCOUNT')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'ACCOUNT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Users size={18} /> 账户设置
          </button>
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
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {user.username} · 系统就绪
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin/system"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Settings2 size={16} />
                系统管理
              </Link>
            )}
            {isAdmin && activeTab === 'PROMPT' && (
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
          {[
            ...(isAdmin ? [['USERS', '2.0 用户']] : []),
            ['RESOURCES', '2.1 资源'],
            ['GROUPS', '2.2 分组'],
            ['RECORDS', '2.3 研究'],
            ['CLICK_FLOW', '点击流'],
            ...(isAdmin ? [['PROMPT', '2.4 Prompt'], ['SYSTEM_DATA', '2.5 数据']] : []),
            ['ACCOUNT', '账户']
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as TeacherTab)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${
                activeTab === tab
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-10">
          {activeTab === 'USERS' && renderUserManagement()}
          {isAdmin && activeTab === 'PROMPT' && (
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

          {activeTab === 'RESOURCES' && <TeachingResourceManager />}
          {activeTab === 'GROUPS' && <TeachingGroupManager />}
          {activeTab === 'RECORDS' && renderResearchLab()}
          {activeTab === 'CLICK_FLOW' && renderClickFlow()}
          {isAdmin && activeTab === 'SYSTEM_DATA' && renderSystemData()}
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

const X = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default TeacherDashboard;
