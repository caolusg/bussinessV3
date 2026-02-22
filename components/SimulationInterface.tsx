import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Bot, FileText, User, HelpCircle, Check, Lock, ChevronRight, Mic, Users } from 'lucide-react';
import { TaskDetail, TaskMode, StageStatus, ChatMessage } from '../types';
import { STAGES, OPPONENT_PROFILE, INITIAL_CHAT_MESSAGES } from '../constants';

interface SimulationInterfaceProps {
  task: TaskDetail;
  onExit: () => void;
  onTriggerCoaching: () => void;
  onTriggerGroupDiscussion: () => void;
}

const SimulationInterface: React.FC<SimulationInterfaceProps> = ({ task, onExit, onTriggerCoaching, onTriggerGroupDiscussion }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isFirstAttempt = task.attemptCount <= 1 && task.mode !== TaskMode.COMPLETED;
  
  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'USER',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* 1. Simulation Top Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="flex items-center gap-1 text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            结束/退出谈判
          </button>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-2">
             <span className="font-bold text-slate-800 text-sm">📍 当前：第 {task.stageId} 环节 【{task.title.split(' ')[0]}】</span>
             <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
               第 {Math.max(1, task.attemptCount)}/{task.maxAttempts} 次尝试
             </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. Left Sidebar: Global Navigation */}
        <aside className="w-60 bg-white border-r border-gray-200 flex flex-col hidden md:flex shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">🗺️ 外贸全流程地图</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {STAGES.map((stage) => {
               const isActive = stage.id === task.stageId;
               const isCompleted = stage.status === StageStatus.COMPLETED;
               const isLocked = stage.status === StageStatus.LOCKED;

               return (
                 <div key={stage.id} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'
                 }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] shrink-0 ${
                      isCompleted ? 'bg-green-500 border-green-500 text-white' :
                      isActive ? 'bg-white border-blue-500 text-blue-600 font-bold' :
                      'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                       {isCompleted ? <Check size={12} /> : isLocked ? <Lock size={10} /> : stage.id}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-medium truncate ${
                        isActive ? 'text-blue-800' : isCompleted ? 'text-green-700' : 'text-gray-400'
                      }`}>
                        {stage.title.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">{stage.title.split('(')[1]?.replace(')', '')}</span>
                    </div>
                    {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                 </div>
               );
            })}
          </div>
        </aside>

        {/* 3. Center Column: Chat Area */}
        <main className="flex-1 flex flex-col bg-slate-100/50 relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => {
              const isMe = msg.sender === 'USER';
              return (
                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      isMe ? 'bg-blue-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'
                    }`}>
                      {isMe ? <User size={16} /> : <span className="font-bold text-xs">{OPPONENT_PROFILE.avatarInitials}</span>}
                    </div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 font-medium">
                            {isMe ? '我方: 张明' : `对方: ${OPPONENT_PROFILE.name}`}
                          </span>
                          <span className="text-[10px] text-gray-300">{msg.timestamp}</span>
                       </div>
                       <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                         isMe 
                           ? 'bg-blue-600 text-white rounded-tr-sm' 
                           : 'bg-white text-slate-700 border border-gray-200 rounded-tl-sm'
                       }`}>
                         {msg.text}
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200 shrink-0">
             <div className="max-w-4xl mx-auto flex items-end gap-3">
               <div className="flex-1 bg-gray-50 border border-gray-300 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                  <textarea 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="输入消息，尝试与客户沟通..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-10 max-h-32 text-slate-700 placeholder:text-slate-400"
                    rows={1}
                  />
               </div>
               <button className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <Mic size={20} />
               </button>
               <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200 transition-all transform active:scale-95"
               >
                  <Send size={18} />
               </button>
             </div>
          </div>
        </main>

        {/* 4. Right Sidebar: Dynamic Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto">
           
           {!isFirstAttempt && (
             <div className="p-5 border-b border-gray-100 bg-amber-50/40">
                <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold text-sm">
                   <Bot size={18} />
                   <h3>AI 教练复盘</h3>
                </div>
                <div className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm text-xs text-slate-700 leading-5">
                  "{task.feedbackOrTipContent}"
                </div>
             </div>
           )}

           <div className="p-5 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">🧑‍💼 对手信息</h3>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    {OPPONENT_PROFILE.avatarInitials}
                 </div>
                 <div>
                    <div className="text-sm font-bold text-slate-800">{OPPONENT_PROFILE.name}</div>
                    <div className="text-xs text-slate-500">{OPPONENT_PROFILE.role}</div>
                 </div>
              </div>
           </div>

           <div className="p-5 flex-1">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">📋 任务目标</h3>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm font-medium text-blue-900 leading-6">
                 {isFirstAttempt 
                   ? "任务目标：想办法让客户接受你的报价，不限手段。"
                   : "任务目标：请结合 FOB 术语的风险划分，再次向客户解释报价的合理性。"
                 }
              </div>

              <div className="mt-8 space-y-3">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">🆘 支援工具箱</h3>
                 
                 {/* Discussion Room Trigger */}
                 {!isFirstAttempt && (
                    <button 
                      onClick={onTriggerGroupDiscussion}
                      className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white p-1.5 rounded-md">
                            <Users size={16} />
                        </div>
                        <span className="text-xs font-bold text-indigo-800">
                            进入小组复盘讨论室
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-indigo-400" />
                    </button>
                 )}

                 <button 
                    onClick={onTriggerCoaching}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
                 >
                    <div className="flex items-center gap-3">
                       <div className="bg-yellow-100 text-yellow-600 p-1.5 rounded-md">
                          <HelpCircle size={16} />
                       </div>
                       <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">
                          {isFirstAttempt ? "请求提示" : "请求 AI 教练当前指导"}
                       </span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400" />
                 </button>
              </div>
           </div>

        </aside>
      </div>
    </div>
  );
};

export default SimulationInterface;