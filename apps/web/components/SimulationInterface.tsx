import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  FileText,
  HelpCircle,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  User,
  Users,
  X
} from 'lucide-react';
import * as Tesseract from 'tesseract.js';
import type {
  ChatMessage,
  SimulationOrchestration,
  TaskDetail,
  UserProfile
} from '../types';
import { INITIAL_CHAT_MESSAGES, OPPONENT_PROFILE, STAGES } from '../constants';
import { apiFetch, apiRequest } from '../utils/apiFetch';

interface SimulationInterfaceProps {
  task: TaskDetail;
  currentUser?: UserProfile | null;
  onExit: () => void;
  onTriggerCoaching: (context?: { sessionId?: string; stage?: string }) => void;
  onTriggerGroupDiscussion: () => void;
}

type SimulationStage =
  | 'acquisition'
  | 'quotation'
  | 'negotiation'
  | 'contract'
  | 'preparation'
  | 'customs'
  | 'settlement'
  | 'after_sales';

type SimulationApiMessage = {
  id: string;
  role: string;
  content: string;
  coachNote?: string | null;
  assessmentJson?: SimulationOrchestration['assessment'];
  traceJson?: SimulationOrchestration['trace'];
  personaJson?: SimulationOrchestration['personaSnapshot'];
  turnIndex: number;
  createdAt: string | Date;
};

type SessionCache = {
  sessionId: string | null;
  messages: ChatMessage[];
  coachNote: string | null;
  assessmentSummary: string | null;
  assessmentStrengths: string[];
  assessmentRisks: string[];
  traceLabel: string | null;
  difficultyLabel: string | null;
  cultureHints: string[];
};

type DocumentContext = {
  id: string;
  fileName: string;
  kind: 'pdf' | 'word' | 'image' | 'text';
  text: string;
};

const stageKeyMap: Record<number, SimulationStage> = {
  1: 'acquisition',
  2: 'quotation',
  3: 'negotiation',
  4: 'contract',
  5: 'preparation',
  6: 'customs',
  7: 'settlement',
  8: 'after_sales'
};

const stageIdMap: Record<SimulationStage, number> = {
  acquisition: 1,
  quotation: 2,
  negotiation: 3,
  contract: 4,
  preparation: 5,
  customs: 6,
  settlement: 7,
  after_sales: 8
};

type StageTaskResponse = {
  stage: {
    key: SimulationStage;
    titleZh: string;
    titleEn?: string | null;
  };
  task: {
    title?: string | null;
    taskCode?: string | null;
    goal: string;
    subGoal?: string | null;
    tipTitle?: string | null;
    tipContent?: string | null;
  } | null;
};

const difficultyMap = {
  down: '降低难度',
  keep: '保持难度',
  up: '提高难度'
} as const;

function toChatMessage(msg: SimulationApiMessage): ChatMessage {
  const sender =
    msg.role === 'user' || msg.role === 'student'
      ? 'USER'
      : msg.role === 'system' || msg.role === 'coach'
        ? 'SYSTEM'
        : 'OPPONENT';

  return {
    id: msg.id,
    sender,
    text: msg.content,
    timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    turnIndex: msg.turnIndex,
    coachNote: msg.coachNote ?? undefined,
    assessment: msg.assessmentJson ?? undefined,
    trace: msg.traceJson ?? undefined,
    personaSnapshot: msg.personaJson ?? undefined
  };
}

function getSessionCacheKey(stage: SimulationStage) {
  return `simulation_session_cache:${stage}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function detectDocumentKind(file: File): DocumentContext['kind'] {
  const name = file.name.toLowerCase();
  if (file.type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (file.type.includes('word') || name.endsWith('.docx')) return 'word';
  if (file.type.startsWith('image/')) return 'image';
  return 'text';
}

function buildDocumentContextPrompt(contexts: DocumentContext[]) {
  const text = contexts
    .map((context, index) => [
      `【资料 ${index + 1}：${context.fileName}】`,
      context.text.slice(0, 5000)
    ].join('\n'))
    .join('\n\n');
  return text.slice(0, 12000);
}

function readSessionCache(stage: SimulationStage): SessionCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(getSessionCacheKey(stage));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionCache>;
    if (!Array.isArray(parsed.messages)) return null;
    return {
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : null,
      messages: parsed.messages as ChatMessage[],
      coachNote: typeof parsed.coachNote === 'string' ? parsed.coachNote : null,
      assessmentSummary: typeof parsed.assessmentSummary === 'string' ? parsed.assessmentSummary : null,
      assessmentStrengths: Array.isArray(parsed.assessmentStrengths) ? parsed.assessmentStrengths.filter((item) => typeof item === 'string') : [],
      assessmentRisks: Array.isArray(parsed.assessmentRisks) ? parsed.assessmentRisks.filter((item) => typeof item === 'string') : [],
      traceLabel: typeof parsed.traceLabel === 'string' ? parsed.traceLabel : null,
      difficultyLabel: typeof parsed.difficultyLabel === 'string' ? parsed.difficultyLabel : null,
      cultureHints: Array.isArray(parsed.cultureHints) ? parsed.cultureHints.filter((item) => typeof item === 'string') : []
    };
  } catch {
    return null;
  }
}

function writeSessionCache(stage: SimulationStage, cache: SessionCache) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(getSessionCacheKey(stage), JSON.stringify(cache));
  } catch {
    // Ignore storage failures; the live UI state still works.
  }
}

const SimulationInterface: React.FC<SimulationInterfaceProps> = ({
  task,
  currentUser,
  onExit,
  onTriggerCoaching,
  onTriggerGroupDiscussion
}) => {
  const [activeTask, setActiveTask] = useState<TaskDetail>(task);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [sessionReloadKey, setSessionReloadKey] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [assessmentSummary, setAssessmentSummary] = useState<string | null>(null);
  const [assessmentStrengths, setAssessmentStrengths] = useState<string[]>([]);
  const [assessmentRisks, setAssessmentRisks] = useState<string[]>([]);
  const [traceLabel, setTraceLabel] = useState<string | null>(null);
  const [difficultyLabel, setDifficultyLabel] = useState<string | null>(null);
  const [cultureHints, setCultureHints] = useState<string[]>([]);
  const [documentContexts, setDocumentContexts] = useState<DocumentContext[]>([]);
  const [uploadingContext, setUploadingContext] = useState(false);
  const [uploadingContextStatus, setUploadingContextStatus] = useState('');
  const [currentStage, setCurrentStage] = useState<SimulationStage>(
    stageKeyMap[task.stageId] ?? 'acquisition'
  );
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cachedSession = useRef<SessionCache | null>(null);
  const [hydratedStage, setHydratedStage] = useState<SimulationStage | null>(null);

  const currentStageMeta =
    STAGES.find((stage) => stageKeyMap[stage.id] === currentStage) ?? STAGES[0];
  const currentUserName = currentUser?.realName?.trim() || currentUser?.username?.trim() || '我方';

  useEffect(() => {
    setCurrentStage(stageKeyMap[task.stageId] ?? 'acquisition');
    setActiveTask(task);
  }, [task.stageId]);

  useEffect(() => {
    let ignore = false;

    apiRequest<StageTaskResponse>(`/api/content/stages/${currentStage}/task`)
      .then((response) => {
        if (ignore) return;
        if (response.task) {
          setActiveTask({
            stageId: stageIdMap[response.stage.key],
            mode: task.mode,
            title: `${response.stage.titleZh}${response.stage.titleEn ? ` (${response.stage.titleEn})` : ''}`,
            taskId: response.task.taskCode ?? task.taskId,
            description: response.task.goal,
            subDescription: response.task.subGoal ?? undefined,
            feedbackOrTipTitle: response.task.tipTitle ?? undefined,
            feedbackOrTipContent: response.task.tipContent ?? ''
          });
        }
      })
      .catch(() => {
        if (!ignore) {
          setActiveTask(task);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentStage, task]);

  useEffect(() => {
    const cached = readSessionCache(currentStage);
    cachedSession.current = cached;
    if (!cached) {
      setMessages([]);
      setCurrentSessionId(null);
      setInputValue('');
      resetStructuredFeedback();
      setHydratedStage(currentStage);
      return;
    }

    setMessages(cached.messages);
    setCurrentSessionId(cached.sessionId);
    setCoachNote(cached.coachNote);
    setAssessmentSummary(cached.assessmentSummary);
    setAssessmentStrengths(cached.assessmentStrengths);
    setAssessmentRisks(cached.assessmentRisks);
    setTraceLabel(cached.traceLabel);
    setDifficultyLabel(cached.difficultyLabel);
    setCultureHints(cached.cultureHints);
    setHydratedStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetStructuredFeedback = () => {
    setCoachNote(null);
    setAssessmentSummary(null);
    setAssessmentStrengths([]);
    setAssessmentRisks([]);
    setTraceLabel(null);
    setDifficultyLabel(null);
    setCultureHints([]);
  };

  const updateStructuredFeedback = (orchestration?: SimulationOrchestration) => {
    setCoachNote(orchestration?.coachNote ?? null);
    setAssessmentSummary(orchestration?.assessment?.summary ?? null);
    setAssessmentStrengths(orchestration?.assessment?.strengths ?? []);
    setAssessmentRisks(orchestration?.assessment?.risks ?? []);
    setCultureHints(orchestration?.personaSnapshot?.cultureHints ?? []);
    setDifficultyLabel(
      orchestration?.personaSnapshot?.difficultyAdjustment
        ? difficultyMap[orchestration.personaSnapshot.difficultyAdjustment]
        : null
    );

    if (!orchestration?.trace) {
      setTraceLabel(null);
      return;
    }

    const parts = [
      orchestration.trace.provider.toUpperCase(),
      orchestration.trace.usedWebSearch ? 'Web Search' : null,
      orchestration.trace.degraded ? 'Fallback' : null
    ].filter(Boolean);

    setTraceLabel(parts.join(' / '));
  };

  useEffect(() => {
    if (hydratedStage !== currentStage) return;

    writeSessionCache(currentStage, {
      sessionId: currentSessionId,
      messages,
      coachNote,
      assessmentSummary,
      assessmentStrengths,
      assessmentRisks,
      traceLabel,
      difficultyLabel,
      cultureHints
    });
  }, [
    currentStage,
    currentSessionId,
    messages,
    coachNote,
    assessmentSummary,
    assessmentStrengths,
    assessmentRisks,
    traceLabel,
    difficultyLabel,
    cultureHints,
    hydratedStage
  ]);

  useEffect(() => {
    let cancelled = false;
    const cached = cachedSession.current;
    const hasRestoredConversation = Boolean(
      cached?.sessionId && (cached.messages.length ?? 0) > 1
    );

    if (sessionReloadKey === 0 && hasRestoredConversation) {
      setCurrentSessionId(cached?.sessionId ?? null);
      setMessages(cached?.messages ?? []);
      return () => {
        cancelled = true;
      };
    }

    const loadSession = async () => {
      setLoadingSession(true);
      setSessionLoadError(null);
      resetStructuredFeedback();

      try {
        const { res, data } = await apiFetch<{
          session?: { id: string };
          orchestration?: SimulationOrchestration | null;
          messages?: SimulationApiMessage[];
        }>(`/api/simulations/session?stage=${currentStage}`);

        if (!res.ok || cancelled) {
          if (!cancelled) {
            setSessionLoadError('当前会话加载失败，请刷新后重试。');
          }
          return;
        }

        const sessionMessages = Array.isArray(data?.messages)
          ? data.messages.map(toChatMessage)
          : [];
        const shouldUseCachedMessages =
          Boolean(cached?.sessionId && data?.session?.id && cached.sessionId === data.session.id) &&
          (cached?.messages.length ?? 0) > sessionMessages.length;
        const nextMessages = shouldUseCachedMessages ? cached.messages : sessionMessages;

        setCurrentSessionId(data?.session?.id ?? null);
        setMessages(nextMessages);
        updateStructuredFeedback(data?.orchestration ?? undefined);
      } catch (error) {
        if (cancelled) return;
        console.error('Load simulation session failed', error);
        setSessionLoadError(error instanceof Error ? error.message : '当前会话加载失败，请刷新后重试。');
      } finally {
        if (!cancelled) {
          setLoadingSession(false);
        }
      }
  };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [currentStage, sessionReloadKey]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending || loadingSession) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('未登录，请先登录');
      return;
    }

    const optimisticId = `tmp-${Date.now()}`;
    const optimisticText = inputValue.trim();
    const productCatalogContext = buildDocumentContextPrompt(documentContexts);
    const visibleMessages = messages.length > 0 ? messages : INITIAL_CHAT_MESSAGES;
    const nextTurn = (visibleMessages[visibleMessages.length - 1]?.turnIndex ?? 0) + 1;
    const optimistic: ChatMessage = {
      id: optimisticId,
      sender: 'USER',
      text: optimisticText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      turnIndex: nextTurn
    };

    setMessages((prev) => [...(prev.length > 0 ? prev : INITIAL_CHAT_MESSAGES), optimistic]);
    setInputValue('');
    setSending(true);

    try {
      const { res, data, text } = await apiFetch<{
        sessionId?: string;
        messages?: SimulationApiMessage[];
        orchestration?: SimulationOrchestration;
      }>(`/api/simulations/${currentStage}/message`, {
        method: 'POST',
        body: JSON.stringify({
          content: optimisticText,
          productCatalogContext: productCatalogContext || null
        })
      });

      if (!res.ok) {
        console.error('Simulation send failed', { status: res.status, body: text });
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        alert('发送失败，请稍后重试');
        return;
      }

      const returnedMessages = Array.isArray(data?.messages) ? data.messages : [];
      if (data?.sessionId) {
        setCurrentSessionId(data.sessionId);
      }
      if (returnedMessages.length > 0) {
        setMessages(returnedMessages.map(toChatMessage));
      } else {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      }
      updateStructuredFeedback(data?.orchestration);
    } catch (error) {
      console.error('Simulation send error', error);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      alert(error instanceof Error ? error.message : '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleContextFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingContext) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('文件不能超过 8MB。');
      return;
    }

    setUploadingContext(true);
    setUploadingContextStatus(`正在读取：${file.name}`);
    try {
      let text = '';
      const kind = detectDocumentKind(file);
      if (kind === 'image') {
        setUploadingContextStatus(`正在识别图片：${file.name}`);
        const result = await Tesseract.recognize(file, 'chi_sim+eng');
        text = result.data.text.trim();
      } else {
        setUploadingContextStatus(`正在解析文档：${file.name}`);
        const dataUrl = await readFileAsDataUrl(file);
        const parsed = await apiRequest<{
          fileName: string;
          mimeType: string;
          text: string;
        }>('/api/simulations/context-file', {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            dataUrl
          })
        });
        text = parsed.text.trim();
      }

      if (!text) {
        setUploadingContextStatus('没有读取到可用文本');
        alert('没有读取到可用文本。扫描版 PDF 请先转成图片上传，或使用可复制文字的 PDF/Word。');
        return;
      }

      setDocumentContexts((current) => [
        ...current,
        {
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          kind,
          text: text.slice(0, 6000)
        }
      ].slice(-4));
      setUploadingContextStatus(`已加入资料：${file.name}`);
    } catch (error) {
      setUploadingContextStatus('资料读取失败');
      alert(error instanceof Error ? error.message : '资料读取失败，请换一个文件试试。');
    } finally {
      setUploadingContext(false);
    }
  };

  const handleRestart = async () => {
    if (restarting || sending || loadingSession) return;

    const confirmed = window.confirm(
      '确定结束当前对话并开始一个新话题吗？旧对话会保留在后台记录里，但不会再带入新话题。'
    );
    if (!confirmed) return;

    setRestarting(true);
    resetStructuredFeedback();

    try {
      const { res, data, text } = await apiFetch<{
        session?: { id: string };
        orchestration?: SimulationOrchestration | null;
        messages?: SimulationApiMessage[];
      }>(`/api/simulations/${currentStage}/restart`, {
        method: 'POST'
      });

      if (!res.ok) {
        console.error('Simulation restart failed', { status: res.status, body: text });
        alert('重新开始失败，请稍后重试。');
        return;
      }

      const sessionMessages = Array.isArray(data?.messages)
        ? data.messages.map(toChatMessage)
        : [];

      setCurrentSessionId(data?.session?.id ?? null);
      setMessages(sessionMessages);
      setInputValue('');
      setDocumentContexts([]);
      updateStructuredFeedback(data?.orchestration ?? undefined);
    } catch (error) {
      console.error('Simulation restart error', error);
      alert(error instanceof Error ? error.message : '重新开始失败，请稍后重试。');
    } finally {
      setRestarting(false);
    }
  };

  const handleEndAndExit = async () => {
    if (endingSession || restarting || sending || loadingSession) return;

    setEndingSession(true);
    try {
      await apiFetch(`/api/simulations/${currentStage}/end`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('End simulation session failed', error);
    } finally {
      setEndingSession(false);
      setCurrentSessionId(null);
      setMessages([]);
      setDocumentContexts([]);
      resetStructuredFeedback();
      onExit();
    }
  };

  const displayMessages =
    messages.length > 0 || loadingSession ? messages : INITIAL_CHAT_MESSAGES;

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 font-sans text-slate-900"
      data-analytics-page="simulation"
      data-analytics-stage={currentStage}
      data-analytics-session-id={currentSessionId ?? ''}
    >
      <header className="z-50 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-800">
              当前：第 {currentStageMeta.id} 环节「{currentStageMeta.title.split(' ')[0]}」
            </span>
            <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 sm:inline-flex">
              无限练习
            </span>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 md:hidden">
        {STAGES.map((stage) => {
          const key = stageKeyMap[stage.id];
          const isActive = key === currentStage;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                if (key && key !== currentStage) {
                  setCurrentStage(key);
                  resetStructuredFeedback();
                }
              }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                isActive
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {stage.id}. {stage.title.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-gray-200 bg-white px-3 py-2 xl:hidden">
        <button
          type="button"
          onClick={() => onTriggerCoaching({ sessionId: currentSessionId ?? undefined, stage: currentStage })}
          disabled={loadingSession || !currentSessionId}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <HelpCircle size={15} />
          AI 教练指导
        </button>
        <button
          type="button"
          onClick={onTriggerGroupDiscussion}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700"
        >
          <Users size={15} />
          小组复盘
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
          <div className="border-b border-gray-100 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              全流程地图
            </h3>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {STAGES.map((stage) => {
              const isActive = stageKeyMap[stage.id] === currentStage;

              return (
                <div
                  key={stage.id}
                  className={`rounded-lg px-3 py-3 text-sm transition-colors ${
                    isActive ? 'border border-blue-100 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <button
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => {
                      const key = stageKeyMap[stage.id];
                      if (key && key !== currentStage) {
                        setCurrentStage(key);
                        resetStructuredFeedback();
                      }
                    }}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        isActive
                          ? 'border-blue-500 bg-white font-bold text-blue-600'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {stage.id}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span
                        className={`truncate font-medium ${
                          isActive ? 'text-blue-800' : 'text-slate-600'
                        }`}
                      >
                        {stage.title.split(' ')[0]}
                      </span>
                      <span className="truncate text-[10px] text-gray-400">
                        {stage.title.split('(')[1]?.replace(')', '')}
                      </span>
                    </div>
                    {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col bg-slate-100/50">
          <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:space-y-6 sm:p-4">
            {loadingSession && messages.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                正在加载当前环节会话...
              </div>
            )}

            {displayMessages.map((msg) => {
              const isMe = msg.sender === 'USER';
              const isSystem = msg.sender === 'SYSTEM';

              return (
                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`flex max-w-[94%] gap-2 sm:max-w-[78%] sm:gap-3 md:max-w-[62%] ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm sm:h-9 sm:w-9 ${
                        isMe
                          ? 'bg-blue-600 text-white'
                          : isSystem
                            ? 'border border-amber-200 bg-amber-100 text-amber-700'
                            : 'border border-indigo-100 bg-white text-indigo-600'
                      }`}
                    >
                      {isMe ? (
                        <User size={16} />
                      ) : isSystem ? (
                        <Bot size={16} />
                      ) : (
                        <span className="text-xs font-bold">{OPPONENT_PROFILE.avatarInitials}</span>
                      )}
                    </div>

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">
                          {isMe ? `我方：${currentUserName}` : isSystem ? 'AI 教练' : `对方：${OPPONENT_PROFILE.name}`}
                        </span>
                        <span className="text-[10px] text-gray-300">{msg.timestamp}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-sm sm:px-4 sm:py-3 ${
                          isMe
                            ? 'rounded-tr-sm bg-blue-600 text-white'
                            : isSystem
                              ? 'rounded-tl-sm border border-amber-200 bg-amber-50 text-amber-900'
                              : 'rounded-tl-sm border border-gray-200 bg-white text-slate-700'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={chatEndRef} />
          </div>

          <details className="shrink-0 border-t border-gray-200 bg-white px-4 py-2 xl:hidden">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">
              练习目标与本轮反馈
            </summary>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                <div>{activeTask.description}</div>
                {activeTask.subDescription && (
                  <div className="mt-2 text-xs text-blue-700">{activeTask.subDescription}</div>
                )}
              </div>

              {(coachNote || assessmentSummary) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-slate-700">
                  <div className="mb-2 font-bold text-amber-700">AI 教练复盘</div>
                  {coachNote && <div>{coachNote}</div>}
                  {assessmentSummary && <div className="mt-2">{assessmentSummary}</div>}
                </div>
              )}

            </div>
          </details>

          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2 sm:px-6 sm:py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleContextFileUpload}
              className="hidden"
            />
            <div className="mx-auto w-full max-w-6xl space-y-3">
              {documentContexts.length > 0 && (
                <div className="flex max-h-16 flex-wrap gap-2 overflow-y-auto pr-1">
                  {documentContexts.map((context) => (
                    <div
                      key={context.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800"
                      title={context.fileName}
                    >
                      <FileText size={14} />
                      <span className="max-w-56 truncate">{context.fileName}</span>
                      <span className="text-[10px] font-bold uppercase text-blue-400">
                        {context.kind}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDocumentContexts((current) =>
                            current.filter((item) => item.id !== context.id)
                          )
                        }
                        className="rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                        aria-label={`移除 ${context.fileName}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="flex min-h-[60px] flex-1 flex-col gap-2 rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 sm:min-h-[72px] sm:px-4 sm:py-3">
                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingContext || loadingSession}
                      aria-label="上传产品资料"
                      title="上传 PDF、Word 或截图，让 AI 阅读后参与对话"
                      className="mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploadingContext ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Paperclip size={16} />
                      )}
                    </button>
                    <textarea
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder="输入消息，与客户进行业务沟通..."
                      className="min-h-10 max-h-24 flex-1 resize-none border-none bg-transparent py-1.5 text-base leading-6 text-slate-700 placeholder:text-slate-400 focus:ring-0 sm:min-h-12 sm:max-h-36 sm:py-2"
                      rows={1}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!inputValue.trim() || sending || loadingSession}
                      aria-label="发送消息"
                      className="mb-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs sm:py-2 ${
                      uploadingContext
                        ? 'border-blue-100 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {uploadingContext ? <Loader2 className="animate-spin" size={14} /> : <Paperclip size={14} />}
                    <span className="truncate">
                      {uploadingContextStatus || '可上传 PDF、Word 或截图作为对话资料'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:w-36 sm:shrink-0 sm:flex-col">
                  <button
                    type="button"
                    onClick={() => void handleRestart()}
                    disabled={restarting || endingSession || sending || loadingSession}
                    aria-label="开始新的练习"
                    title="开始新的练习"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    {restarting ? '创建中...' : '新的练习'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEndAndExit()}
                    disabled={endingSession || restarting || sending || loadingSession}
                    aria-label="结束本轮对话"
                    title="结束本轮对话"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft size={14} />
                    {endingSession ? '结束中...' : '结束对话'}
                  </button>
                </div>
              </div>
            </div>
            {sessionLoadError && (
              <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span>{sessionLoadError}</span>
                <button
                  onClick={() => setSessionReloadKey((value) => value + 1)}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  重新加载
                </button>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-[30rem] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white xl:flex 2xl:w-[36rem]">
          {(coachNote || assessmentSummary) && (
            <div className="border-b border-gray-100 bg-amber-50/40 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700">
                <Bot size={18} />
                <h3>AI 教练复盘</h3>
              </div>
              {coachNote && (
                <div className="rounded-lg border border-amber-200 bg-white p-3 text-xs leading-5 text-slate-700 shadow-sm">
                  {coachNote}
                </div>
              )}
              {assessmentSummary && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                  {assessmentSummary}
                </div>
              )}
              {traceLabel && (
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {traceLabel}
                </div>
              )}
              {difficultyLabel && (
                <div className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  {difficultyLabel}
                </div>
              )}
              {assessmentStrengths.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Strengths
                  </div>
                  <div className="mt-2 space-y-2">
                    {assessmentStrengths.map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {assessmentRisks.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    Risks
                  </div>
                  <div className="mt-2 space-y-2">
                    {assessmentRisks.map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {cultureHints.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Culture Hints
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cultureHints.map((item) => (
                      <div
                        key={item}
                        className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] text-indigo-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-b border-gray-100 p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              对手信息
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                {OPPONENT_PROFILE.avatarInitials}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">{OPPONENT_PROFILE.name}</div>
                <div className="text-xs text-slate-500">{OPPONENT_PROFILE.role}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              练习目标
            </h3>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-medium leading-6 text-blue-900">
              <div>{activeTask.description}</div>
              {activeTask.subDescription && (
                <div className="mt-2 text-xs font-normal text-blue-700">{activeTask.subDescription}</div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                支持工具箱
              </h3>

              <button
                onClick={onTriggerGroupDiscussion}
                className="group w-full rounded-lg border-2 border-indigo-100 bg-indigo-50/50 p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-indigo-600 p-1.5 text-white">
                      <Users size={16} />
                    </div>
                    <span className="text-xs font-bold text-indigo-800">进入小组复盘讨论室</span>
                  </div>
                  <ChevronRight size={14} className="text-indigo-400" />
                </div>
              </button>

              <button
                onClick={() => onTriggerCoaching({ sessionId: currentSessionId ?? undefined, stage: currentStage })}
                disabled={loadingSession || !currentSessionId}
                className="group w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-blue-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                title={!currentSessionId ? '当前会话还在加载，请稍后再请求 AI 教练指导' : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-yellow-100 p-1.5 text-yellow-600">
                      <HelpCircle size={16} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">
                      请求 AI 教练指导
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400" />
                </div>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SimulationInterface;
