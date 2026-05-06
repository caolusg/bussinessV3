import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bot,
  Copy,
  HelpCircle,
  Loader2,
  RefreshCw,
  Send,
  User,
  X
} from 'lucide-react';
import { MOCK_COACHING_SESSION, OPPONENT_PROFILE } from '../constants';
import { apiRequest } from '../utils/apiFetch';
import { trackPracticeEvent } from '../utils/clickFlowTracker';

interface CoachingReviewProps {
  onClose: () => void;
  onRetry: () => void;
  onBackToResources: () => void;
}

type CoachContextMessage = {
  id: string;
  role: string;
  speakerLabel: string;
  content: string;
  coachNote?: string | null;
  turnIndex: number;
  createdAt: string;
};

type CoachContext = {
  session: {
    id: string;
    stage: string;
    status: string;
    attemptNo: number;
    title?: string | null;
    businessStage?: {
      titleZh?: string | null;
      titleEn?: string | null;
      description?: string | null;
    } | null;
    task?: {
      title?: string | null;
      goal?: string | null;
      subGoal?: string | null;
    } | null;
  };
  summary: string;
  suggestedQuestions: string[];
  messages: CoachContextMessage[];
};

type CoachReply = {
  answer: string;
  degraded: boolean;
  suggestedQuestions: string[];
};

type CoachingTurn = {
  id: string;
  question: string;
  answer: string;
  degraded: boolean;
};

const CoachingReview: React.FC<CoachingReviewProps> = ({
  onClose,
  onRetry,
  onBackToResources
}) => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { summary, chatHistory, annotations } = MOCK_COACHING_SESSION;
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>('cm2');
  const [context, setContext] = useState<CoachContext | null>(null);
  const [turns, setTurns] = useState<CoachingTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [loadingContext, setLoadingContext] = useState(Boolean(sessionId));
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    setLoadingContext(true);
    setError(null);

    apiRequest<CoachContext>(`/api/simulations/coach/${sessionId}/context`)
      .then((data) => {
        if (!cancelled) {
          setContext(data);
          setQuestion(data.suggestedQuestions[0] ?? '');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'AI 教练上下文加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const askCoach = async (nextQuestion = question) => {
    if (!sessionId || !nextQuestion.trim() || asking) return;

    try {
      setAsking(true);
      setError(null);
      const data = await apiRequest<CoachReply>(`/api/simulations/coach/${sessionId}/message`, {
        method: 'POST',
        body: JSON.stringify({ question: nextQuestion.trim() })
      });
      setTurns((current) => [
        ...current,
        {
          id: `${Date.now()}`,
          question: nextQuestion.trim(),
          answer: data.answer,
          degraded: data.degraded
        }
      ]);
      setQuestion('');
      setContext((current) =>
        current ? { ...current, suggestedQuestions: data.suggestedQuestions } : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 教练暂时不可用');
    } finally {
      setAsking(false);
    }
  };

  const copyCoachAnswer = async (turn: CoachingTurn) => {
    await navigator.clipboard.writeText(turn.answer);
    trackPracticeEvent({
      eventType: 'ai_coach_answer_copied',
      page: 'coach',
      label: '复制 AI 教练回复',
      target: 'button',
      sessionId,
      stage: context?.session.stage ?? null,
      metadata: {
        source: 'coach_reply',
        turnId: turn.id,
        question: turn.question.slice(0, 500),
        answer_excerpt: turn.answer.slice(0, 1000),
        answer_length: turn.answer.length,
        degraded: turn.degraded
      }
    });
  };

  const toggleAnnotation = (msgId: string) => {
    if (annotations[msgId]) {
      setExpandedAnnotationId(expandedAnnotationId === msgId ? null : msgId);
    }
  };

  if (!sessionId) {
    return (
      <div
        className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans"
        data-analytics-page="coach"
        data-analytics-session-id={sessionId ?? ''}
      >
        <header className="z-50 shrink-0 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">返回练习</span>
            </button>

            <div className="flex items-center gap-2 font-bold text-slate-800">
              <div className="rounded-md bg-blue-600 p-1 text-white">
                <Bot size={16} />
              </div>
              <span>上下文 AI 教练</span>
            </div>

            <button
              onClick={onClose}
              aria-label="关闭 AI 教练"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <X size={18} />
              <span className="text-sm font-medium">退出指导</span>
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HelpCircle size={22} />
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-900">没有可读取的当前会话</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              AI 指导只会读取当前练习会话。请先回到练习页，等待当前会话加载完成后再请求指导。
            </p>
            <button
              onClick={onRetry}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              回到练习
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (sessionId) {
    return (
      <div
        className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans"
        data-analytics-page="coach"
        data-analytics-session-id={sessionId ?? ''}
      >
        <header className="z-50 shrink-0 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={onRetry}
              className="flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">返回练习</span>
            </button>

            <div className="flex items-center gap-2 font-bold text-slate-800">
              <div className="rounded-md bg-blue-600 p-1 text-white">
                <Bot size={16} />
              </div>
              <span>上下文 AI 教练</span>
            </div>

            <button
              onClick={onClose}
              aria-label="关闭 AI 教练"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <X size={18} />
              <span className="text-sm font-medium">退出指导</span>
            </button>
          </div>
        </header>

        <main className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(520px,34vw)] overflow-hidden max-xl:grid-cols-1 max-xl:overflow-y-auto">
          <section className="overflow-y-auto px-8 py-8 max-xl:overflow-visible max-lg:px-5">
            {loadingContext && (
              <div className="flex items-center gap-3 rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                <Loader2 className="animate-spin text-blue-600" size={18} />
                正在读取当前会话上下文...
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {context && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {context.session.businessStage?.titleZh ?? context.session.stage}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">当前会话指导</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {context.summary}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800">当前对话</h3>
                  <div className="mt-5 space-y-4">
                    {context.messages.map((message) => {
                      const isStudent = message.role === 'student';
                      return (
                        <div key={message.id} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-5 py-4 text-sm leading-7 ${
                            isStudent
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-200 bg-slate-50 text-slate-700'
                          }`}>
                            <div className={`mb-1 text-[10px] font-black uppercase tracking-widest ${
                              isStudent ? 'text-blue-100' : 'text-slate-400'
                            }`}>
                              {message.speakerLabel} · turn {message.turnIndex}
                            </div>
                            {message.content}
                            {message.coachNote && (
                              <div className={`mt-3 rounded-xl p-3 text-xs ${
                                isStudent ? 'bg-white/10 text-blue-50' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {message.coachNote}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {turns.map((turn) => (
                    <div key={turn.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-black text-slate-400">你的问题</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{turn.question}</p>
                      <div className="mt-4 rounded-2xl bg-blue-50 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                            AI 教练{turn.degraded ? ' · fallback' : ''}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyCoachAnswer(turn)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-600 transition hover:bg-blue-100"
                            aria-label="复制 AI 教练回复"
                            title="复制 AI 教练回复"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{turn.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="overflow-y-auto border-l border-slate-200 bg-white p-6 max-xl:border-l-0 max-xl:border-t max-xl:p-5">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-300" />
                <h3 className="text-sm font-black">AI 预判你可能需要</h3>
              </div>
              <div className="mt-4 space-y-2">
                {(context?.suggestedQuestions ?? []).map((item) => (
                  <button
                    key={item}
                    onClick={() => void askCoach(item)}
                    disabled={asking}
                    className="w-full rounded-xl bg-white/10 px-3 py-3 text-left text-xs font-semibold leading-5 text-slate-100 transition hover:bg-white/15 disabled:opacity-60"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                追问 AI 教练
              </label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="mt-3 h-36 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                placeholder="比如：客户刚才说的交期风险是什么意思？我下一句怎么回复？"
              />
              <button
                onClick={() => void askCoach()}
                disabled={asking || !question.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {asking ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {asking ? '生成指导中...' : '发送问题'}
              </button>
            </div>

            <button
              onClick={onBackToResources}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <BookOpen size={16} />
              查看学习资源
            </button>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white font-sans">
      <header className="z-50 shrink-0 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">返回练习</span>
          </button>

          <div className="flex items-center gap-2 font-bold text-slate-800">
            <div className="rounded-md bg-indigo-600 p-1 text-white">
              <Bot size={16} />
            </div>
            <span>AI 教练复盘</span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <X size={18} />
            <span className="text-sm font-medium">退出复盘</span>
          </button>
        </div>

        <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-5">
          <div className="mx-auto flex max-w-4xl items-start gap-6">
            <div className="shrink-0 rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-100">
              <Bot size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-800">
                复盘摘要
              </h3>
              <p className="text-sm font-medium leading-relaxed text-slate-700">{summary}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
          {chatHistory.map((msg) => {
            const isMe = msg.sender === 'USER';
            const annotation = annotations[msg.id];
            const isExpanded = expandedAnnotationId === msg.id;

            return (
              <div key={msg.id} className="group">
                <div className={`mb-3 flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ${
                      isMe ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
                    }`}>
                      {isMe ? <User size={18} /> : <span>{OPPONENT_PROFILE.avatarInitials}</span>}
                    </div>

                    <div
                      onClick={() => annotation && toggleAnnotation(msg.id)}
                      className={`relative rounded-3xl border-2 px-6 py-4 text-[15px] leading-relaxed transition-all ${
                        annotation
                          ? 'cursor-pointer border-red-100 bg-red-50/50 text-slate-800 hover:border-red-200 hover:bg-red-50'
                          : 'border-white bg-white text-slate-600 shadow-sm'
                      } ${isExpanded ? 'border-red-200 ring-4 ring-red-50' : ''}`}
                    >
                      <div className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${
                        isMe ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {isMe ? '我方表达' : `${OPPONENT_PROFILE.name} 的追问`}
                      </div>
                      {msg.text}
                      {annotation && (
                        <div className="absolute -right-3 -top-3 rounded-full bg-red-500 p-1.5 text-white shadow-lg">
                          <AlertCircle size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {annotation && isExpanded && (
                  <div className="mb-10 flex w-full justify-end">
                    <div className="w-[90%] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
                      <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
                        <div className="flex items-center gap-2">
                          <Bot size={18} className="text-blue-400" />
                          <span className="text-sm font-bold">表达复盘</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2 md:divide-x md:divide-slate-100">
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-600">小组共识</h4>
                          <div className="min-h-[120px] rounded-2xl border border-indigo-100/50 bg-indigo-50/50 p-5">
                            <p className="text-sm leading-7 text-slate-700">
                              {annotation.groupConsensus || '本条暂未形成明确小组共识。'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 md:pl-8">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600">AI 诊断</h4>
                          <div className="min-h-[120px] rounded-2xl border border-blue-100/50 bg-blue-50/50 p-5">
                            <p className="text-sm font-medium leading-7 text-slate-800">
                              {annotation.analysis}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="z-50 shrink-0 border-t border-gray-200 bg-white p-6 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-6">
          <button
            onClick={onBackToResources}
            className="flex items-center gap-3 rounded-2xl border-2 border-transparent px-8 py-4 font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
          >
            <BookOpen size={20} />
            查看学习资源
          </button>

          <button
            onClick={onRetry}
            className="flex items-center gap-4 rounded-2xl bg-blue-600 px-12 py-4 font-bold text-white shadow-2xl shadow-blue-100 transition-all hover:bg-blue-700 hover:shadow-blue-200 active:scale-[0.98]"
          >
            <RefreshCw size={20} />
            回到练习继续对话
          </button>
        </div>
      </footer>
    </div>
  );
};

export default CoachingReview;
