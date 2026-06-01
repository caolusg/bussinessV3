import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bot,
  MessageCircle
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import heroImage from '../assets/home-hero-business-chinese.webp';

type HomePageProps = {
  isAuthenticated: boolean;
};

const features = [
  {
    icon: <Bot size={20} />,
    title: 'AI 商务对话实训',
    detail: '围绕获客、报价、磋商、合同、备货、报关、结算和售后，反复练习真实外贸沟通。'
  },
  {
    icon: <BookOpen size={20} />,
    title: '阶段化学习资源',
    detail: '每个业务环节配套词汇、句式和外贸常识，可以边查边练。'
  },
  {
    icon: <MessageCircle size={20} />,
    title: '即时表达反馈',
    detail: '在模拟沟通后获得表达建议，帮助练习者调整措辞、语气和业务说明。'
  }
];

const workflows = [
  '选择业务环节',
  '进入模拟谈判',
  '获得 AI 对手回复',
  '查看教练反馈',
  '持续改进表达'
];

const HomePage: React.FC<HomePageProps> = ({ isAuthenticated }) => {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/40 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo compact />
          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-950">功能</a>
            <a href="#workflow" className="hover:text-slate-950">流程</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
              >
                进入工作台
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login/student"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                >
                  登录
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[88vh] overflow-hidden pt-20">
          <img
            src={heroImage}
            alt="国际学习者在商务中文 AI 实训课堂中进行外贸沟通练习"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.90)_28%,rgba(255,255,255,0.42)_52%,rgba(255,255,255,0.04)_100%)]" />
          <div className="relative mx-auto flex min-h-[calc(88vh-5rem)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-red-700">Business Chinese AI Simulation</p>
              <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                商通中文
              </h1>
              <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-700">
                面向国际贸易场景的商务中文自由练习平台，在 AI 客户对话中练表达、懂业务、提升真实沟通能力。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/login/student"
                  className="inline-flex items-center gap-2 rounded-full bg-red-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-900/15 hover:bg-red-800"
                >
                  开始练习
                  <ArrowRight size={17} />
                </Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm font-bold text-slate-700">
                <div className="rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur">
                  <div className="text-2xl font-black text-slate-950">8</div>
                  <div className="mt-1 text-xs text-slate-500">外贸业务环节</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur">
                  <div className="text-2xl font-black text-slate-950">AI</div>
                  <div className="mt-1 text-xs text-slate-500">客户与教练反馈</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur">
                  <div className="text-2xl font-black text-slate-950">Task</div>
                  <div className="mt-1 text-xs text-slate-500">情境任务练习</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-red-700">Platform Value</p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">从语言练习走向业务表达</h2>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-red-700 shadow-sm">
                    {feature.icon}
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{feature.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-slate-200 bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-red-300">Learning Flow</p>
              <h2 className="mt-3 text-3xl font-black">进入后看到的是练习，不是说明书</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
                平台把学习资源、任务目标、模拟谈判和教练反馈放在同一个工作流里，降低从“知道词语”到“完成商务沟通”的距离。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {workflows.map((item, index) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-700 text-sm font-black">
                    {index + 1}
                  </div>
                  <p className="mt-4 text-sm font-black leading-6">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo compact />
          <div className="flex flex-wrap gap-4">
            <Link to="/login/student" className="hover:text-slate-950">登录入口</Link>
            <Link to="/forgot-password" className="hover:text-slate-950">找回密码</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
