import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bot,
  Copy,
  RefreshCw,
  Tag,
  User,
  Users,
  X
} from 'lucide-react';
import { MOCK_COACHING_SESSION, OPPONENT_PROFILE } from '../constants';

interface CoachingReviewProps {
  onClose: () => void;
  onRetry: () => void;
  onBackToResources: () => void;
}

const CoachingReview: React.FC<CoachingReviewProps> = ({
  onClose,
  onRetry,
  onBackToResources
}) => {
  const { summary, chatHistory, annotations } = MOCK_COACHING_SESSION;
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>('cm2');

  const toggleAnnotation = (msgId: string) => {
    if (annotations[msgId]) {
      setExpandedAnnotationId(expandedAnnotationId === msgId ? null : msgId);
    }
  };

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
          <div className="text-center">
            <div className="inline-flex items-center gap-4 rounded-full border border-slate-200 bg-white px-6 py-2 shadow-sm">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Users size={14} className="text-indigo-500" /> 小组观点
              </span>
              <div className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Bot size={14} className="text-blue-500" /> AI 诊断
              </span>
            </div>
            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
              选择带标记的消息查看分析
            </p>
          </div>

          {chatHistory.map((msg) => {
            const isMe = msg.sender === 'USER';
            const annotation = annotations[msg.id];
            const isExpanded = expandedAnnotationId === msg.id;

            return (
              <div key={msg.id} className="group">
                <div className={`mb-3 flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ${
                        isMe
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-600'
                      }`}
                    >
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
                      <div
                        className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${
                          isMe ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
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
                  <div className="mb-10 flex w-full justify-end animate-in slide-in-from-top-4 duration-500">
                    <div className="w-[90%] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
                      <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
                        <div className="flex items-center gap-2">
                          <Bot size={18} className="text-blue-400" />
                          <span className="text-sm font-bold">表达复盘</span>
                        </div>
                        <div className="flex gap-1">
                          {annotation.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2 md:divide-x md:divide-slate-100">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-indigo-600">
                            <Users size={18} />
                            <h4 className="text-sm font-bold uppercase tracking-wider">小组共识</h4>
                          </div>
                          <div className="min-h-[120px] rounded-2xl border border-indigo-100/50 bg-indigo-50/50 p-5">
                            <p className="text-sm leading-7 text-slate-700">
                              {annotation.groupConsensus || '本条暂未形成明确小组共识。'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 md:pl-8">
                          <div className="flex items-center gap-2 text-blue-600">
                            <Bot size={18} />
                            <h4 className="text-sm font-bold uppercase tracking-wider">AI 诊断</h4>
                          </div>
                          <div className="min-h-[120px] rounded-2xl border border-blue-100/50 bg-blue-50/50 p-5">
                            <p className="text-sm font-medium leading-7 text-slate-800">
                              {annotation.analysis}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase text-emerald-600">
                              <Tag size={12} /> 推荐改写
                            </div>
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-relaxed text-slate-800 shadow-inner">
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: annotation.correction.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 border-t border-slate-100 bg-slate-50 px-8 py-4">
                        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-600 shadow-sm transition-all hover:text-blue-600 active:scale-95">
                          <Copy size={16} />
                          复制推荐表达
                        </button>
                        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 p-3 text-xs font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">
                          <BookOpen size={16} />
                          学习关联知识点：{annotation.relatedResource}
                        </button>
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
