import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit3, Loader2, Plus, RefreshCw, Save, Search, X } from 'lucide-react';
import { apiRequest } from '../utils/apiFetch';

type ManagedResource = {
  id: string;
  stageId: string;
  type: 'vocabulary' | 'phrases' | 'knowledge';
  term: string;
  explanation: string;
  example?: string | null;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

type ManagedStage = {
  id: string;
  key: string;
  sortOrder: number;
  titleZh: string;
  titleEn?: string | null;
  resources: ManagedResource[];
};

type ResourceManagerData = {
  stages: ManagedStage[];
  totals: {
    stageCount: number;
    resourceCount: number;
    activeResourceCount: number;
  };
};

type ResourceForm = {
  stageId: string;
  type: ManagedResource['type'];
  term: string;
  explanation: string;
  example: string;
  sortOrder: number;
  isActive: boolean;
};

const RESOURCE_TYPES: Array<{ value: ManagedResource['type']; label: string }> = [
  { value: 'vocabulary', label: '词汇' },
  { value: 'phrases', label: '表达句型' },
  { value: 'knowledge', label: '商务知识' }
];

const emptyForm = (stageId = ''): ResourceForm => ({
  stageId,
  type: 'vocabulary',
  term: '',
  explanation: '',
  example: '',
  sortOrder: 0,
  isActive: true
});

const typeLabel = (type: ManagedResource['type']) =>
  RESOURCE_TYPES.find((item) => item.value === type)?.label ?? type;

const TeachingResourceManager: React.FC = () => {
  const [data, setData] = useState<ResourceManagerData | null>(null);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ResourceForm>(emptyForm());
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    apiRequest<ResourceManagerData>('/api/admin/resources/manager')
      .then((payload) => {
        setData(payload);
        const nextStageId = selectedStageId || payload.stages[0]?.id || '';
        setSelectedStageId(nextStageId);
        setForm((current) => ({
          ...current,
          stageId: current.stageId || nextStageId
        }));
      })
      .catch((err) => setError(err instanceof Error ? err.message : '资源加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedStage = data?.stages.find((stage) => stage.id === selectedStageId) ?? null;
  const resources = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = selectedStage?.resources ?? [];
    if (!keyword) return rows;
    return rows.filter((resource) =>
      [resource.term, resource.explanation, resource.example ?? '', typeLabel(resource.type)]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [search, selectedStage]);

  const resetForm = (stageId = selectedStageId) => {
    setEditingId('');
    setForm(emptyForm(stageId));
  };

  const startEdit = (resource: ManagedResource) => {
    setEditingId(resource.id);
    setForm({
      stageId: resource.stageId,
      type: resource.type,
      term: resource.term,
      explanation: resource.explanation,
      example: resource.example ?? '',
      sortOrder: resource.sortOrder,
      isActive: resource.isActive
    });
  };

  const saveResource = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      term: form.term.trim(),
      explanation: form.explanation.trim(),
      example: form.example.trim() || null
    };

    try {
      await apiRequest(
        editingId ? `/api/admin/resources/${editingId}` : '/api/admin/resources',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        }
      );
      resetForm(payload.stageId);
      await apiRequest<ResourceManagerData>('/api/admin/resources/manager').then((payload) => {
        setData(payload);
        setSelectedStageId(form.stageId);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '资源保存失败');
    } finally {
      setSaving(false);
    }
  };

  const disableResource = async (resourceId: string) => {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/admin/resources/${resourceId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '资源停用失败');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Resource Manager</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">教学资源管理</h3>
            <p className="mt-2 text-sm text-slate-400">
              管理学生端阶段学习资源。保存后会进入数据库，学生重新打开资源面板即可看到更新。
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['阶段', data?.totals.stageCount ?? 0],
              ['资源', data?.totals.resourceCount ?? 0],
              ['启用', data?.totals.activeResourceCount ?? 0]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800">业务阶段</h4>
              {loading && <Loader2 className="animate-spin text-indigo-500" size={16} />}
            </div>
            <div className="space-y-2">
              {(data?.stages ?? []).map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => {
                    setSelectedStageId(stage.id);
                    resetForm(stage.id);
                  }}
                  className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                    selectedStageId === stage.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-sm font-black">{stage.sortOrder}. {stage.titleZh}</p>
                  <p className={`mt-1 text-xs ${selectedStageId === stage.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {stage.resources.filter((resource) => resource.isActive).length} 个启用资源
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    {selectedStage?.key ?? 'stage'}
                  </p>
                  <h4 className="mt-1 text-xl font-black text-slate-900">
                    {selectedStage?.titleZh ?? '请选择阶段'}
                  </h4>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索术语、解释或示例"
                    className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left">类型</th>
                    <th className="px-5 py-3 text-left">资源内容</th>
                    <th className="px-5 py-3 text-right">排序</th>
                    <th className="px-5 py-3 text-right">状态</th>
                    <th className="px-5 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((resource) => (
                    <tr key={resource.id} className="align-top text-slate-600">
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600">
                          {typeLabel(resource.type)}
                        </span>
                      </td>
                      <td className="max-w-xl px-5 py-4">
                        <p className="font-black text-slate-900">{resource.term}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{resource.explanation}</p>
                        {resource.example && (
                          <p className="mt-2 line-clamp-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
                            {resource.example}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-bold">{resource.sortOrder}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          resource.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {resource.isActive ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(resource)}
                            className="rounded-xl bg-slate-50 p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title="编辑"
                          >
                            <Edit3 size={15} />
                          </button>
                          {resource.isActive && (
                            <button
                              onClick={() => disableResource(resource.id)}
                              className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"
                              title="停用"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!resources.length && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                        暂无资源，右侧可以新增。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={saveResource} className="self-start rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  {editingId ? 'Edit Resource' : 'New Resource'}
                </p>
                <h4 className="mt-1 text-lg font-black text-slate-900">
                  {editingId ? '编辑资源' : '新增资源'}
                </h4>
              </div>
              <BookOpen className="text-indigo-500" size={20} />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-black text-slate-400">阶段</span>
                <select
                  value={form.stageId}
                  onChange={(event) => setForm({ ...form, stageId: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                >
                  {(data?.stages ?? []).map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.sortOrder}. {stage.titleZh}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-400">类型</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as ManagedResource['type'] })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-400">标题 / 术语</span>
                <input
                  value={form.term}
                  onChange={(event) => setForm({ ...form, term: event.target.value })}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-400">解释</span>
                <textarea
                  value={form.explanation}
                  onChange={(event) => setForm({ ...form, explanation: event.target.value })}
                  required
                  className="mt-2 h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-400">示例</span>
                <textarea
                  value={form.example}
                  onChange={(event) => setForm({ ...form, example: event.target.value })}
                  className="mt-2 h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-black text-slate-400">排序</span>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-400">状态</span>
                  <select
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 hover:bg-slate-50"
              >
                清空
              </button>
              <button
                type="submit"
                disabled={saving || !form.stageId}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : editingId ? <Save size={18} /> : <Plus size={18} />}
                {editingId ? '保存修改' : '新增资源'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default TeachingResourceManager;
