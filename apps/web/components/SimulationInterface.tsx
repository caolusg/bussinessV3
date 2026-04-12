import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  HelpCircle,
  Mic,
  RotateCcw,
  Send,
  User,
  Users
} from 'lucide-react';
import type {
  ChatMessage,
  SimulationOrchestration,
  TaskDetail
} from '../types';
import { INITIAL_CHAT_MESSAGES, OPPONENT_PROFILE, STAGES } from '../constants';
import { apiFetch } from '../utils/apiFetch';

interface SimulationInterfaceProps {
  task: TaskDetail;
  onExit: () => void;
  onTriggerCoaching: () => void;
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

const SimulationInterface: React.FC<SimulationInterfaceProps> = ({
  task,
  onExit,
  onTriggerCoaching,
  onTriggerGroupDiscussion
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [assessmentSummary, setAssessmentSummary] = useState<string | null>(null);
  const [assessmentStrengths, setAssessmentStrengths] = useState<string[]>([]);
  const [assessmentRisks, setAssessmentRisks] = useState<string[]>([]);
  const [traceLabel, setTraceLabel] = useState<string | null>(null);
  const [difficultyLabel, setDifficultyLabel] = useState<string | null>(null);
  const [cultureHints, setCultureHints] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<SimulationStage>(
    stageKeyMap[task.stageId] ?? 'acquisition'
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentStageMeta =
    STAGES.find((stage) => stageKeyMap[stage.id] === currentStage) ?? STAGES[0];

  useEffect(() => {
    setCurrentStage(stageKeyMap[task.stageId] ?? 'acquisition');
  }, [task.stageId]);

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
    let cancelled = false;

    const loadSession = async () => {
      setLoadingSession(true);
      resetStructuredFeedback();

      try {
        const { res, data } = await apiFetch<{
          orchestration?: SimulationOrchestration | null;
          messages?: SimulationApiMessage[];
        }>(`/api/simulations/session?stage=${currentStage}`);

        if (!res.ok || cancelled) return;

        const sessionMessages = Array.isArray(data?.messages)
          ? data.messages.map(toChatMessage)
          : [];

        setMessages(sessionMessages);
        updateStructuredFeedback(data?.orchestration ?? undefined);
      } catch (error) {
        if (cancelled) return;
        console.error('Load simulation session failed', error);
        setMessages([]);
        resetStructuredFeedback();
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
  }, [currentStage]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('未登录，请先登录');
      return;
    }

    const optimisticId = `tmp-${Date.now()}`;
    const optimisticText = inputValue.trim();
    const nextTurn = (messages[messages.length - 1]?.turnIndex ?? 0) + 1;
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

    setMessages((prev) => [...prev, optimistic]);
    setInputValue('');
    setSending(true);

    try {
      const { res, data, text } = await apiFetch<{
        messages?: SimulationApiMessage[];
        orchestration?: SimulationOrchestration;
      }>(`/api/simulations/${currentStage}/message`, {
        method: 'POST',
        body: JSON.stringify({ content: optimisticText })
      });

      if (!res.ok) {
        console.error('Simulation send failed', { status: res.status, body: text });
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        alert('发送失败，请稍后重试');
        return;
      }

      const returnedMessages = Array.isArray(data?.messages) ? data.messages : [];
      const nextMessages = [
        ...messages.filter((message) => message.id !== optimisticId),
        ...returnedMessages.map(toChatMessage)
      ].sort((a, b) => (a.turnIndex ?? 0) - (b.turnIndex ?? 0));

      setMessages(nextMessages);
      updateStructuredFeedback(data?.orchestration);
    } catch (error) {
      console.error('Simulation send error', error);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      alert(error instanceof Error ? error.message : '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleRestart = async () => {
    if (restarting || sending || loadingSession) return;

    const confirmed = window.confirm(
      '确定要重新开始当前阶段对话吗？当前进行中的这轮对话会被结束，并新建一条空白会话。'
    );
    if (!confirmed) return;

    setRestarting(true);
    resetStructuredFeedback();

    try {
      const { res, data, text } = await apiFetch<{
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

      setMessages(sessionMessages);
      setInputValue('');
      updateStructuredFeedback(data?.orchestration ?? undefined);
    } catch (error) {
      console.error('Simulation restart error', error);
      alert(error instanceof Error ? error.message : '重新开始失败，请稍后重试。');
    } finally {
      setRestarting(false);
    }
  };

  const displayMessages =
    messages.length > 0 || loadingSession ? messages : INITIAL_CHAT_MESSAGES;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      <header className="z-50 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleRestart}
            disabled={restarting || sending || loadingSession}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={16} />
            {restarting ? '重新开始中...' : '重新开始'}
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <ArrowLeft size={16} />
            结束/退出练习
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              当前：第 {currentStageMeta.id} 环节「{currentStageMeta.title.split(' ')[0]}」
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              无限练习
            </span>
          </div>
        </div>
      </header>

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

        <main className="relative flex flex-1 flex-col bg-slate-100/50">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
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
                    className={`flex max-w-[80%] gap-3 md:max-w-[70%] ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${
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
                          {isMe ? '我方：张明' : isSystem ? 'AI 教练' : `对方：${OPPONENT_PROFILE.name}`}
                        </span>
                        <span className="text-[10px] text-gray-300">{msg.timestamp}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
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

          <div className="shrink-0 border-t border-gray-200 bg-white p-4">
            <div className="mx-auto flex max-w-4xl items-end gap-3">
              <div className="flex-1 rounded-xl border border-gray-300 bg-gray-50 p-3 transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
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
                  className="h-10 max-h-32 w-full resize-none border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0"
                  rows={1}
                />
              </div>
              <button className="rounded-full p-3 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                <Mic size={20} />
              </button>
              <button
                onClick={() => void handleSend()}
                disabled={!inputValue.trim() || sending}
                className="rounded-xl bg-blue-600 p-3 text-white shadow-md shadow-blue-200 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </main>

        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white">
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
              <div>{task.description}</div>
              {task.subDescription && (
                <div className="mt-2 text-xs font-normal text-blue-700">{task.subDescription}</div>
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
                onClick={onTriggerCoaching}
                className="group w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-blue-300 hover:bg-gray-50"
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
