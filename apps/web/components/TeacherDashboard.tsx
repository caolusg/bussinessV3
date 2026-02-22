
import React, { useState } from 'react';
import { 
  Users, BookOpen, BarChart3, Settings2, LogOut, Search, 
  FilePlus, CheckCircle2, UserCheck, Timer, PieChart, 
  Code2, Send, Filter, MoreHorizontal, LayoutGrid, List,
  Activity, ClipboardList, Target, Group, Download, Trash2, Edit3, Share2, AlertCircle, Info, ChevronRight, UserCircle, Save, Plus, MessageSquare, Briefcase, BrainCircuit, Bot, Zap, ShieldAlert, FileSearch, Settings, MessageCircle, PlayCircle, Star, GraduationCap, Copy, Wand2,
  Loader2,
  Lock
} from 'lucide-react';
import { UserProfile } from '../types';

interface TeacherDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'RESOURCES' | 'GROUPS' | 'RECORDS' | 'PROMPT'>('PROMPT');
  
  // Scenario Designer State
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock scenarios mapping to the 8 stages
  const [scenarios, setScenarios] = useState([
    { id: 1, name: '1. 获客阶段：商务礼仪与名片交换', stage: 1, type: 'Built-in', active: true, prompt: '你是一个严格的采购经理...' },
    { id: 2, name: '2. 报价阶段：术语 FOB/CIF 详解', stage: 2, type: 'Built-in', active: true, prompt: '重点考察 FOB 术语理解...' },
    { id: 3, name: '3. 磋商阶段：价格异议处理策略', stage: 3, type: 'Built-in', active: true, prompt: '针对价格分歧进行极限施压...' },
    { id: 4, name: '4. 合同阶段：法律术语与风险规避', stage: 4, type: 'Built-in', active: true, prompt: '法律严密性审核...' },
    { id: 5, name: '5. 备货阶段：生产进度与质量监控', stage: 5, type: 'Draft', active: false, prompt: '' },
  ]);

  const handleClone = (scenario: any) => {
    const newScenario = {
      ...scenario,
      id: Date.now(),
      name: `${scenario.name} (副本)`,
      type: 'Custom',
      active: false
    };
    setScenarios([...scenarios, newScenario]);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsAddingNew(false);
      setSelectedScenarioId(null);
    }, 1000);
  };

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId);

  const renderPlaceholder = (title: string, icon: React.ReactNode) => (
    <div className="bg-white rounded-[40px] border border-slate-100 p-20 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
      <div className="bg-indigo-50 p-6 rounded-[30px] text-indigo-600">
        {/* Fix: use React.isValidElement and cast to React.ReactElement<any> to allow 'size' prop in cloneElement */}
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 48 }) : icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
        <p className="text-slate-400 max-w-sm">该模块正在开发集成中，预计将于下一版本正式发布。请先使用“提示词工程”进行实训配置。</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar Navigation */}
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
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} /> 安全退出登录
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-40">
           <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-800">
                {activeTab === 'PROMPT' ? "提示词 (Prompt) 模板管理" : 
                 activeTab === 'RESOURCES' ? "教学资源管理" :
                 activeTab === 'GROUPS' ? "分组管理" : "学习记录查询"}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 系统就绪
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <button 
                onClick={() => {setIsAddingNew(true); setSelectedScenarioId(null);}}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs"
              >
                <Plus size={16} /> 新增模板/资源
              </button>
           </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'PROMPT' && (
            <div className="space-y-8">
              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                        Stage {scenario.stage}
                      </span>
                      {scenario.type === 'Built-in' && (
                        <Lock size={14} className="text-slate-300" />
                      )}
                    </div>
                    
                    <h3 className="font-bold text-slate-800 mb-2 leading-tight flex-1">
                      {scenario.name}
                    </h3>

                    <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-50">
                      <button 
                        onClick={() => setSelectedScenarioId(scenario.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                      >
                        <Edit3 size={14} /> 编辑
                      </button>
                      <button 
                        onClick={() => handleClone(scenario)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                      >
                        <Copy size={14} /> 复制模板
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => setIsAddingNew(true)}
                  className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-4 hover:bg-white hover:border-indigo-300 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:shadow-lg transition-all">
                    <Plus size={24} />
                  </div>
                  <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600">添加新教学场景</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'RESOURCES' && renderPlaceholder("教学资源管理", <BookOpen />)}
          {activeTab === 'GROUPS' && renderPlaceholder("班级与分组管理", <Users />)}
          {activeTab === 'RECORDS' && renderPlaceholder("学习数据分析", <BarChart3 />)}

          {/* Simple Form (Modal or Full View) */}
          {(isAddingNew || selectedScenarioId) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="bg-indigo-600 p-8 text-white flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{isAddingNew ? '新建提示词模板' : '编辑场景逻辑'}</h3>
                    <p className="text-indigo-100 text-xs mt-1 opacity-80">定义 AI 对手行为、复盘规则与教练逻辑</p>
                  </div>
                  <button onClick={() => {setIsAddingNew(false); setSelectedScenarioId(null);}} className="p-2 hover:bg-white/10 rounded-full transition-colors">
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

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">对应的业务阶段</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s} selected={currentScenario?.stage === s}>Stage {s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">难度等级</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                        <option>HSK 3-4</option>
                        <option selected>HSK 4-5</option>
                        <option>HSK 5-6</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-slate-100 flex gap-4">
                  <button onClick={() => {setIsAddingNew(false); setSelectedScenarioId(null);}} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all">取消</button>
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
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

const X = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18M6 6l12 12"/></svg>
);

export default TeacherDashboard;
