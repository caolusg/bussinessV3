
import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Copy, ExternalLink, Lightbulb, Rocket, Tag, User, X, Bot, Users, ArrowRightLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { MOCK_COACHING_SESSION, OPPONENT_PROFILE, USER_PROFILE } from '../constants';

interface CoachingReviewProps {
  onClose: () => void;
  onRetry: () => void;
  onBackToResources: () => void;
}

const CoachingReview: React.FC<CoachingReviewProps> = ({ onClose, onRetry, onBackToResources }) => {
  const { summary, chatHistory, annotations } = MOCK_COACHING_SESSION;
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>('cm2'); 

  const toggleAnnotation = (msgId: string) => {
    if (annotations[msgId]) {
      setExpandedAnnotationId(expandedAnnotationId === msgId ? null : msgId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      {/* 1. Header & Summary */}
      <header className="shrink-0 border-b border-gray-100 shadow-sm z-50">
        <div className="flex items-center justify-between px-6 py-4 bg-white">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium text-sm">返回模拟环境</span>
          </button>
          <div className="font-bold text-slate-800 flex items-center gap-2">
             <div className="bg-indigo-600 text-white p-1 rounded-md">
                <ArrowRightLeft size={16} />
             </div>
             <span>深度对比：小组共识 vs AI 专家诊断</span>
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-md"
          >
            <X size={18} />
            <span className="font-medium text-sm">退出复盘</span>
          </button>
        </div>
        
        {/* Executive Summary */}
        <div className="bg-blue-50/50 px-6 py-5 border-b border-blue-100">
            <div className="max-w-4xl mx-auto flex gap-6 items-start">
                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 shrink-0">
                    <SparklesIcon size={24} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                       综合诊断简报 SUMMARY
                    </h3>
                    <p className="text-slate-700 font-medium leading-relaxed text-sm">
                        {summary}
                    </p>
                </div>
            </div>
        </div>
      </header>

      {/* 2. Annotated Chat History (Scrollable) */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="max-w-5xl mx-auto py-10 px-6 space-y-10">
            
            <div className="text-center">
                <div className="inline-flex items-center gap-4 bg-white border border-slate-200 px-6 py-2 rounded-full shadow-sm">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     <Users size={14} className="text-indigo-500" /> 小组智慧
                  </span>
                  <div className="w-px h-3 bg-slate-200"></div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     <Bot size={14} className="text-blue-500" /> AI 诊断
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-[0.2em] font-medium">逐 句 深 度 对 比 分 析</p>
            </div>

            {chatHistory.map((msg) => {
                const isMe = msg.sender === 'USER';
                const isError = msg.isError;
                const annotation = annotations[msg.id];
                const isExpanded = expandedAnnotationId === msg.id;

                return (
                    <div key={msg.id} className="group">
                        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`flex max-w-[85%] gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-sm font-bold ${
                                    isMe ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                                }`}>
                                    {isMe ? <User size={18} /> : <span>{OPPONENT_PROFILE.avatarInitials}</span>}
                                </div>

                                <div 
                                    onClick={() => isError && toggleAnnotation(msg.id)}
                                    className={`relative px-6 py-4 rounded-3xl text-[15px] leading-relaxed transition-all border-2 ${
                                        isError 
                                          ? 'bg-red-50/50 border-red-100 text-slate-800 cursor-pointer hover:bg-red-50 hover:border-red-200' 
                                          : 'bg-white border-white text-slate-600 shadow-sm'
                                    } ${isExpanded ? 'ring-4 ring-red-50 border-red-200' : ''}`}
                                >
                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isMe ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {isMe ? '我方发送' : `${OPPONENT_PROFILE.name} 的询问`}
                                    </div>
                                    
                                    {msg.text}

                                    {isError && (
                                        <div className="absolute -right-3 -top-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg animate-pulse">
                                            <AlertCircle size={14} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Annotation Comparison Card */}
                        {isError && isExpanded && annotation && (
                            <div className="w-full flex justify-end mb-10 animate-in slide-in-from-top-4 duration-500">
                                <div className="w-[90%] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                                    {/* Sub-header for comparison */}
                                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                                        <div className="flex items-center gap-2">
                                            <SparklesIcon size={18} className="text-blue-400" />
                                            <span className="font-bold text-sm">深度复盘：对比与评估</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {annotation.tags.map(tag => (
                                                <span key={tag} className="text-[9px] bg-white/10 px-2 py-0.5 rounded border border-white/10 uppercase font-bold tracking-tighter">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 divide-x divide-slate-100">
                                        
                                        {/* Group Consensus Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-indigo-600">
                                                <Users size={18} />
                                                <h4 className="font-bold text-sm uppercase tracking-wider">小组研讨共识</h4>
                                            </div>
                                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 min-h-[120px]">
                                                <p className="text-slate-700 text-sm leading-7 italic">
                                                    {annotation.groupConsensus || "本项未在小组研讨中形成明确共识。"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 px-2">
                                                <CheckCircle size={12} /> 小组分析匹配度：85%
                                            </div>
                                        </div>

                                        {/* AI Diagnosis Section */}
                                        <div className="pl-8 space-y-4">
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Bot size={18} />
                                                <h4 className="font-bold text-sm uppercase tracking-wider">AI 专家级诊断</h4>
                                            </div>
                                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 min-h-[120px]">
                                                <p className="text-slate-800 text-sm leading-7 font-medium">
                                                    {annotation.analysis}
                                                </p>
                                            </div>
                                            
                                            {/* Final Correction示范 */}
                                            <div className="space-y-2 mt-4">
                                                <div className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1.5 px-1">
                                                    <SparklesIcon size={12} /> 专家修正话术推荐
                                                </div>
                                                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-slate-800 text-sm leading-relaxed shadow-inner">
                                                    <span dangerouslySetInnerHTML={{ __html: annotation.correction.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-4">
                                        <button className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 p-3 rounded-xl transition-all shadow-sm active:scale-95">
                                            <Copy size={16} />
                                            复制示范话术
                                        </button>
                                        <button className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 border border-indigo-600 p-3 rounded-xl transition-all shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95">
                                            <BookOpen size={16} />
                                            学习关联知识点: {annotation.relatedResource}
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

      {/* 3. Footer Action Bar */}
      <footer className="bg-white border-t border-gray-200 p-6 shrink-0 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
             <button 
                onClick={onBackToResources}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 hover:text-slate-900 transition-all border-2 border-transparent"
             >
                <BookOpen size={20} />
                知识欠缺？前往学习库
             </button>

             <button 
                onClick={onRetry}
                className="flex items-center gap-4 px-12 py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-2xl shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transform active:scale-[0.98] transition-all"
             >
                <Rocket size={20} />
                深度理解完毕，再次练习！
             </button>
        </div>
      </footer>
    </div>
  );
};

// Better Looking Sparkles Icon
const SparklesIcon = ({ size = 24, className = "" }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </svg>
);

export default CoachingReview;
