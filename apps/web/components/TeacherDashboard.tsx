import React, { useEffect, useMemo, useState } from 'react';
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
  Users
} from 'lucide-react';
import { UserProfile } from '../types';
import { apiRequest } from '../utils/apiFetch';

interface TeacherDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

type TeacherTab = 'RESOURCES' | 'GROUPS' | 'RECORDS' | 'PROMPT' | 'SYSTEM_DATA';

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

const DATE_RANGES = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' }
] as const;

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('PROMPT');
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [adminTables, setAdminTables] = useState<AdminTableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState<AdminTableListResponse | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [aiLogSummary, setAiLogSummary] = useState<AiLogSummary | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusField, setStatusField] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [dateField, setDateField] = useState('');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]['value']>('all');
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingSessionSummary, setIsLoadingSessionSummary] = useState(false);
  const [isLoadingStudentSummary, setIsLoadingStudentSummary] = useState(false);
  const [isLoadingAiLogSummary, setIsLoadingAiLogSummary] = useState(false);
  const [rowsRefreshKey, setRowsRefreshKey] = useState(0);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  const [adminError, setAdminError] = useState('');

  const [scenarios, setScenarios] = useState([
    { id: 1, name: '1. 获客阶段：商务礼仪与名片交换', stage: 1, type: 'Built-in', active: true, prompt: '你是一个严格的采购经理...' },
    { id: 2, name: '2. 报价阶段：术语 FOB/CIF 详解', stage: 2, type: 'Built-in', active: true, prompt: '重点考察 FOB 术语理解...' },
    { id: 3, name: '3. 磋商阶段：价格异议处理策略', stage: 3, type: 'Built-in', active: true, prompt: '针对价格分歧进行极限施压...' },
    { id: 4, name: '4. 合同阶段：法律术语与风险规避', stage: 4, type: 'Built-in', active: true, prompt: '法律严密性审核...' },
    { id: 5, name: '5. 备货阶段：生产进度与质量监控', stage: 5, type: 'Draft', active: false, prompt: '' }
  ]);

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

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || adminTables.length > 0) return;

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
  }, [activeTab, adminTables.length, selectedTable]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA') return;

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
  }, [activeTab, overviewRefreshKey]);

  useEffect(() => {
    if (activeTab !== 'SYSTEM_DATA' || !selectedTable) return;

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
  }, [activeTab, selectedTable, tablePage, searchTerm, statusField, statusValue, dateField, dateRange, rowsRefreshKey]);

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

  const handleClone = (scenario: typeof scenarios[number]) => {
    setScenarios([
      ...scenarios,
      {
        ...scenario,
        id: Date.now(),
        name: `${scenario.name} (副本)`,
        type: 'Custom',
        active: false
      }
    ]);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsAddingNew(false);
      setSelectedScenarioId(null);
    }, 1000);
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

  const selectedTableMeta = adminTables.find((table) => table.key === selectedTable);
  const currentStatusValues = statusField
    ? (tableData?.table.statusValues?.[statusField] ?? [])
    : [];

  const pageTitle =
    activeTab === 'PROMPT'
      ? '提示词 (Prompt) 模板管理'
      : activeTab === 'RESOURCES'
        ? '教学资源管理'
        : activeTab === 'GROUPS'
          ? '分组管理'
          : activeTab === 'SYSTEM_DATA'
            ? '系统数据查看'
            : '学习记录查询';

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

      <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-6">
      <aside className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 self-start sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
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
              {tables.map((table) => (
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

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitSearch();
                  }}
                  placeholder="搜索当前表"
                  className="w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
              </div>
              <select
                value={statusField}
                onChange={(event) => {
                  setStatusField(event.target.value);
                  setStatusValue('');
                  setTablePage(1);
                }}
                className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
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
                className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none disabled:opacity-40 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
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
                className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
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
                className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none disabled:opacity-40 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
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

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 shadow-2xl z-50">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
            <Settings2 size={24} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">教师管理后台</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('RESOURCES')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'RESOURCES' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BookOpen size={18} /> 2.1 教学资源管理
          </button>
          <button onClick={() => setActiveTab('GROUPS')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'GROUPS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Group size={18} /> 2.2 分组管理
          </button>
          <button onClick={() => setActiveTab('RECORDS')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'RECORDS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BarChart3 size={18} /> 2.3 学习记录查询
          </button>
          <button onClick={() => setActiveTab('PROMPT')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'PROMPT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Code2 size={18} /> 2.4 提示词工程管理
          </button>
          <button onClick={() => setActiveTab('SYSTEM_DATA')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'SYSTEM_DATA' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Database size={18} /> 2.5 系统数据
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} /> 安全退出登录
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-40">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {user.username} · 系统就绪
            </div>
          </div>

          {activeTab === 'PROMPT' && (
            <button
              onClick={() => {
                setIsAddingNew(true);
                setSelectedScenarioId(null);
              }}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs"
            >
              <Plus size={16} /> 新增模板/资源
            </button>
          )}
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'PROMPT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      Stage {scenario.stage}
                    </span>
                    {scenario.type === 'Built-in' && <Lock size={14} className="text-slate-300" />}
                  </div>

                  <h3 className="font-bold text-slate-800 mb-2 leading-tight flex-1">{scenario.name}</h3>

                  <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-50">
                    <button onClick={() => setSelectedScenarioId(scenario.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                      <Edit3 size={14} /> 编辑
                    </button>
                    <button onClick={() => handleClone(scenario)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all">
                      <Copy size={14} /> 复制模板
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={() => setIsAddingNew(true)} className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-4 hover:bg-white hover:border-indigo-300 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:shadow-lg transition-all">
                  <Plus size={24} />
                </div>
                <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600">添加新教学场景</span>
              </button>
            </div>
          )}

          {activeTab === 'RESOURCES' && renderPlaceholder('教学资源管理', <BookOpen />)}
          {activeTab === 'GROUPS' && renderPlaceholder('班级与分组管理', <Users />)}
          {activeTab === 'RECORDS' && renderPlaceholder('学习数据分析', <BarChart3 />)}
          {activeTab === 'SYSTEM_DATA' && renderSystemData()}

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

                <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">场景名称</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-indigo-50 outline-none"
                      placeholder="例如：6. 报关阶段：单证审核实务"
                      defaultValue={currentScenario?.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">AI 角色与对话提示词 (Prompts)</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-indigo-50 outline-none h-48 leading-relaxed"
                      placeholder="描述 AI 角色性格、博弈目标及对话约束..."
                      defaultValue={currentScenario?.prompt}
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
