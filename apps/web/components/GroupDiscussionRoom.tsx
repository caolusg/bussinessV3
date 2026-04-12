import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle,
  ChevronRight,
  Info,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  User as UserIcon,
  Users
} from 'lucide-react';
import { MOCK_GROUP_DISCUSSION } from '../constants';
import { DiscussionMessage } from '../types';

interface GroupDiscussionRoomProps {
  onClose: () => void;
  onRetry: () => void;
  onGoToCoaching: () => void;
}

const GroupDiscussionRoom: React.FC<GroupDiscussionRoomProps> = ({
  onClose,
  onRetry,
  onGoToCoaching
}) => {
  const { caseTitle, items } = MOCK_GROUP_DISCUSSION;
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [roomPhase, setRoomPhase] = useState<'CHAT' | 'SUMMARY'>('CHAT');
  const [chatMessages, setChatMessages] = useState<DiscussionMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentItemIndex];
  const isLastItem = currentItemIndex === items.length - 1;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, roomPhase]);

  const loadItem = (index: number) => {
    setCurrentItemIndex(index);
    setRoomPhase('CHAT');
    setChatMessages(items[index].messages);
  };

  const startDiscussion = () => {
    setShowInstructions(false);
    loadItem(0);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const newMessage: DiscussionMessage = {
      id: Date.now().toString(),
      member: '成员 A（我）',
      content: inputValue.trim(),
      isUser: true
    };
    setChatMessages((prev) => [...prev, newMessage]);
    setInputValue('');
  };

  const getMemberColor = (member: string) => {
    if (member.includes('我')) return 'bg-blue-600';
    if (member.includes('B')) return 'bg-indigo-500';
    if (member.includes('C')) return 'bg-emerald-500';
    if (member.includes('D')) return 'bg-amber-500';
    return 'bg-purple-500';
  };

  const goToNextItem = () => {
    if (!isLastItem) {
      loadItem(currentItemIndex + 1);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans">
      {showInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-6 bg-gradient-to-br from-indigo-700 to-blue-800 p-8 text-white">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-md">
                <Users size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">小组复盘讨论室</h2>
                <p className="mt-1 text-sm text-blue-100 opacity-90">讨论典型片段，整理表达思路</p>
              </div>
            </div>
            <div className="space-y-8 p-10">
              <div className="flex gap-5">
                <div className="h-fit rounded-xl border border-amber-100 bg-amber-50 p-3 text-amber-600">
                  <Info size={24} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-800">讨论方式</h4>
                  <p className="text-sm leading-relaxed text-slate-600">
                    这里是辅助练习工具，不影响任务状态。你可以针对典型表达片段讨论问题原因、改写方向和业务风险。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                        1
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        先判断这句话的问题：是信息不完整、策略不清，还是没有回应客户关切。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                        2
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        再提出更适合业务场景的中文表达，必要时可以进入 AI 教练页继续看诊断。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={startDiscussion}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700"
              >
                进入讨论
                <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <h1 className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap font-bold tracking-tight text-slate-800 md:max-w-none">
              {caseTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            片段
          </span>
          <span className="text-xs font-bold text-slate-700">
            {currentItemIndex + 1}/{items.length}
          </span>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="z-40 border-b border-gray-100 bg-white px-8 py-6 shadow-sm">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-100">
                <AlertCircle size={14} />
                讨论片段 #{currentItemIndex + 1}
              </div>
              {roomPhase === 'CHAT' && (
                <button
                  onClick={() => setRoomPhase('SUMMARY')}
                  className="group flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-6 py-2 text-xs font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:text-white active:scale-95"
                >
                  <MessageSquare size={14} className="transition-transform group-hover:scale-110" />
                  查看本轮小结
                </button>
              )}
            </div>

            <div className="flex items-start gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="shrink-0 text-blue-100">
                <MessageSquare size={48} />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-xl font-bold italic leading-relaxed text-slate-700">
                  “{currentItem.snippet}”
                </p>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-400">
                    来源：{currentItem.sourceMember}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold text-red-500">
                    <AlertCircle size={12} /> 待改进表达
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 px-8 py-6 scroll-smooth">
          <div className="mx-auto max-w-4xl space-y-8 pb-32">
            <div className="flex items-center justify-center">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                小组讨论区
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {chatMessages.map((msg, index) => (
              <div
                key={msg.id}
                className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${getMemberColor(msg.member)}`}
                >
                  {msg.member.includes('我') ? <UserIcon size={18} /> : msg.member.slice(0, 3)}
                </div>
                <div
                  className={`flex-1 rounded-2xl border p-5 shadow-sm ${
                    msg.isUser
                      ? 'border-blue-600 bg-blue-600 text-white shadow-blue-50'
                      : 'border-slate-100 bg-white text-slate-700'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        msg.isUser ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.member}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {roomPhase === 'SUMMARY' && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 animate-in zoom-in-95 duration-500">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">本轮讨论小结</h4>
                  <p className="text-xs text-emerald-600">
                    重点关注：是否回应客户关切、是否说明业务依据、是否给出可执行下一步。
                  </p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </main>

        <footer className="z-50 shrink-0 border-t border-gray-200 bg-white px-8 py-5 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]">
          <div className="mx-auto max-w-4xl">
            {roomPhase === 'CHAT' ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-inner transition-all focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSendMessage()}
                    placeholder="输入你的看法，讨论这句话可以怎样改..."
                    className="flex-1 border-none bg-transparent text-[15px] text-slate-700 placeholder:text-slate-400 focus:ring-0"
                  />
                  <button className="p-2 text-slate-400 transition-colors hover:text-slate-600">
                    <Mic size={20} />
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="rounded-2xl bg-blue-600 p-4 text-white shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                >
                  <Send size={24} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 shadow-sm">
                    <CheckCircle size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-slate-800">
                      本轮讨论已整理
                    </span>
                    <span className="text-xs font-medium tracking-tight text-slate-400">
                      你可以继续讨论、切换片段，或进入 AI 教练页查看诊断。
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRoomPhase('CHAT')}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                  >
                    继续讨论
                  </button>
                  {!isLastItem && (
                    <button
                      onClick={goToNextItem}
                      className="group flex items-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-black active:scale-95"
                    >
                      切换下一片段
                      <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  )}
                  <button
                    onClick={onGoToCoaching}
                    className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-sm font-bold text-white shadow-2xl shadow-blue-100 transition-all hover:-translate-y-1 hover:shadow-blue-200 active:scale-95"
                  >
                    <Sparkles size={20} className="group-hover:animate-pulse" />
                    看 AI 教练
                  </button>
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-6 py-4 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100 active:scale-95"
                  >
                    <Bot size={18} />
                    回到练习
                  </button>
                </div>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default GroupDiscussionRoom;
