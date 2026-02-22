
import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Quote, AlertCircle, CheckCircle, ArrowLeft, X, Rocket, Loader2, Info, Send, ChevronRight, Mic, User as UserIcon, Sparkles } from 'lucide-react';
import { MOCK_GROUP_DISCUSSION } from '../constants';
import { DiscussionMessage } from '../types';

interface GroupDiscussionRoomProps {
  onClose: () => void;
  onRetry: () => void;
  onGoToCoaching: () => void;
}

const GroupDiscussionRoom: React.FC<GroupDiscussionRoomProps> = ({ onClose, onRetry, onGoToCoaching }) => {
  const { caseTitle, items } = MOCK_GROUP_DISCUSSION;
  
  // Navigation & Phase States
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [roomPhase, setRoomPhase] = useState<'CHAT' | 'ITEM_DONE'>('CHAT');
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<DiscussionMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentItemIndex];
  const isLastItem = currentItemIndex === items.length - 1;

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, roomPhase]);

  const startAnalysis = () => {
    setShowInstructions(false);
    loadItem(0);
  };

  const loadItem = (index: number) => {
    setCurrentItemIndex(index);
    setIsLoadingItem(true);
    setRoomPhase('CHAT');
    
    // Simulate loading state for switching records
    setTimeout(() => {
      setIsLoadingItem(false);
      setChatMessages(items[index].messages);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const newMessage: DiscussionMessage = {
      id: Date.now().toString(),
      member: '组员 A (你)',
      content: inputValue,
      isUser: true
    };
    setChatMessages(prev => [...prev, newMessage]);
    setInputValue('');
  };

  const handleEndItemDiscussion = () => {
    // Simulate AI automated processing
    setRoomPhase('ITEM_DONE');
  };

  const goToNextItem = () => {
    if (!isLastItem) {
      loadItem(currentItemIndex + 1);
    }
  };

  const getMemberColor = (member: string) => {
    if (member.includes('你')) return 'bg-blue-600';
    if (member.includes('B')) return 'bg-indigo-500';
    if (member.includes('C')) return 'bg-emerald-500';
    if (member.includes('D')) return 'bg-amber-500';
    return 'bg-purple-500';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* 1. Entry Tips Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="bg-gradient-to-br from-indigo-700 to-blue-800 p-8 text-white flex items-center gap-6">
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md ring-1 ring-white/20">
                <Users size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">小组复盘研讨室</h2>
                <p className="text-blue-100 text-sm mt-1 opacity-90">多人实时连线 · 深度逻辑拆解</p>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="flex gap-5">
                <div className="bg-amber-50 text-amber-600 p-3 rounded-xl h-fit border border-amber-100">
                  <Info size={24} />
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-lg">研讨引导建议</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    欢迎进入复盘室。请针对小组内出现的<strong>典型问题片段</strong>进行集体研讨。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">1</div>
                      <p className="text-xs text-slate-500 leading-5">剖析对话失败的<strong>根本原因</strong>。系统将自动记录并分析你们的讨论核心。</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">2</div>
                      <p className="text-xs text-slate-500 leading-5">研讨结束后，我们将带您进入 <strong>AI 教练对比环节</strong>，查看小组结论与专家诊断的差异。</p>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={startAnalysis}
                className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
              >
                我知道了，进入讨论
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 shrink-0 px-6 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <h1 className="font-bold text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] md:max-w-none">{caseTitle}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">研讨进度</span>
             <div className="flex gap-1.5">
               {items.map((_, i) => (
                 <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i === currentItemIndex ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.3)]' : i < currentItemIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
               ))}
             </div>
             <span className="text-xs font-bold text-slate-700 ml-1">{currentItemIndex + 1}/{items.length}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Sticky Context Snippet Area */}
        <div className="bg-white border-b border-gray-100 shadow-sm z-40 px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
             {isLoadingItem ? (
               <div className="h-28 flex items-center justify-center gap-4 animate-pulse">
                 <Loader2 size={24} className="text-blue-500 animate-spin" />
                 <span className="text-sm font-bold text-slate-400">正在调取下一条问题记录...</span>
               </div>
             ) : (
               <>
                 <div className="flex items-center justify-between">
                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-blue-100 flex items-center gap-2">
                      <AlertCircle size={14} />
                      正在复盘：案例片段 #{currentItemIndex + 1}
                    </div>
                    {roomPhase === 'CHAT' && (
                      <button 
                        onClick={handleEndItemDiscussion}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-xs font-bold hover:bg-slate-900 hover:text-white transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm group"
                      >
                        <MessageSquare size={14} className="group-hover:scale-110 transition-transform" />
                        研讨完毕，结束本项
                      </button>
                    )}
                 </div>

                 <div className="relative flex gap-6 items-start animate-in slide-in-from-top-4 duration-500">
                    <div className="text-blue-100 shrink-0">
                      <Quote size={48} fill="currentColor" />
                    </div>
                    <div className="space-y-3 flex-1">
                      <p className="text-slate-700 font-bold text-xl leading-relaxed italic">
                        “{currentItem.snippet}”
                      </p>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">源自: {currentItem.sourceMember}</span>
                         <span className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                           <AlertCircle size={12} /> 商业逻辑漏洞
                         </span>
                      </div>
                    </div>
                 </div>
               </>
             )}
          </div>
        </div>

        {/* Scrollable Discussion Chat Area */}
        <main className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50/50 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8 pb-32">
            {isLoadingItem ? (
              <div className="space-y-6 pt-10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 items-start">
                     <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
                     <div className="h-20 flex-1 bg-white rounded-2xl animate-pulse border border-slate-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                    小组实时研讨区域
                  </span>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                {chatMessages.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs text-white shadow-sm ${getMemberColor(msg.member)}`}>
                      {msg.member.includes('你') ? <UserIcon size={18} /> : msg.member.slice(2, 4)}
                    </div>
                    <div className={`flex-1 p-5 rounded-2xl shadow-sm border ${
                      msg.isUser ? 'bg-blue-600 text-white border-blue-600 shadow-blue-50' : 'bg-white border-slate-100 text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase ${msg.isUser ? 'text-blue-100' : 'text-slate-400'}`}>
                          {msg.member}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                
                {roomPhase === 'ITEM_DONE' && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-6 rounded-2xl animate-in zoom-in-95 duration-500">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">AI 已自动提取核心观点并完成归档</h4>
                      <p className="text-xs text-emerald-600">本项讨论已结束，点击底部按钮继续。</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Fixed Footer */}
        <footer className="bg-white border-t border-gray-200 shrink-0 px-8 py-5 z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]">
           <div className="max-w-4xl mx-auto">
             {roomPhase === 'CHAT' ? (
               <div className="flex items-center gap-4">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-5 py-4 focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-400 transition-all shadow-inner">
                     <input 
                       type="text"
                       value={inputValue}
                       disabled={isLoadingItem}
                       onChange={(e) => setInputValue(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder="输入你的见解，与同伴交流该条目..."
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] text-slate-700 placeholder:text-slate-400"
                     />
                     <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <Mic size={20} />
                     </button>
                  </div>
                  <button 
                     onClick={handleSendMessage}
                     disabled={!inputValue.trim() || isLoadingItem}
                     className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-95"
                  >
                     <Send size={24} />
                  </button>
               </div>
             ) : (
               <div className="flex items-center justify-between py-1">
                 <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl shadow-sm">
                      <CheckCircle size={24} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-slate-800">
                        {isLastItem ? '🎉 研讨已结束，数据分析中' : `案例片段 ${currentItemIndex + 1} 讨论已归档`}
                      </span>
                      <span className="text-xs text-slate-400 font-medium tracking-tight">
                        {isLastItem ? '系统已准备好专家级复盘报告，请点击右侧查看对比' : '点击右侧按钮开启下一个案例的实时研讨'}
                      </span>
                    </div>
                 </div>
                 
                 {isLastItem ? (
                   <button 
                     onClick={onGoToCoaching}
                     className="flex items-center gap-4 px-12 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold shadow-2xl shadow-blue-100 hover:shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 group"
                   >
                      <Sparkles size={24} className="group-hover:animate-pulse" />
                      查看 AI 专家深度对比报告
                   </button>
                 ) : (
                   <button 
                     onClick={goToNextItem}
                     className="flex items-center gap-4 px-10 py-5 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:bg-black transition-all transform hover:-translate-y-1 active:scale-95 group"
                   >
                      进入下一条讨论
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                 )}
               </div>
             )}
           </div>
        </footer>

      </div>
    </div>
  );
};

export default GroupDiscussionRoom;
