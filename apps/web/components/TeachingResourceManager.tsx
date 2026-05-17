import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit3, FileText, ImagePlus, Loader2, Plus, RefreshCw, Save, Search, Upload, X } from 'lucide-react';
import * as Tesseract from 'tesseract.js';
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

type ParsedResource = {
  localId: string;
  term: string;
  explanation: string;
  example: string;
  sortOrder: number;
  isActive: boolean;
};

type ResourceImportFileTextResponse = {
  text: string;
  fileName: string;
};

const RESOURCE_TYPES: Array<{ value: ManagedResource['type']; label: string }> = [
  { value: 'vocabulary', label: '商务词汇' },
  { value: 'phrases', label: '常用句式' },
  { value: 'knowledge', label: '外贸常识' }
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
const normalizeOcrSpacing = (value: string) => value.replace(/[\u00a0\u3000]/g, ' ');
const stripLeadingIndex = (line: string) =>
  normalizeOcrSpacing(line).trim().replace(/^\d+[\s.、:：)-]*/, '').trim();
const mergeChineseSpaces = (value: string) =>
  normalizeOcrSpacing(value)
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
const cleanOcrField = (value: string) =>
  mergeChineseSpaces(value)
    .replace(/[|｜]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
const cleanOcrTerm = (value: string) =>
  cleanOcrField(value)
    .replace(/^[^\u4e00-\u9fff]+/, '')
    .replace(/\s*([；;:：])\s*$/g, '')
    .trim();
const extractChineseTerm = (line: string) => cleanOcrTerm(line.match(/[\u4e00-\u9fff]+/g)?.join('') ?? '');

const parseResourceRows = (text: string, startOrder: number): ParsedResource[] =>
  text
    .split(/\r?\n/)
    .map((line) => stripLeadingIndex(line))
    .filter(Boolean)
    .map((line, index) => ({
      localId: `bulk-${startOrder + index}-${line}`,
      term: extractChineseTerm(line),
      explanation: '',
      example: '',
      sortOrder: startOrder + index,
      isActive: true
    }))
    .filter((item) => item.term)
    .map((item, index) => ({
      ...item,
      sortOrder: startOrder + index
    }));

const TeachingResourceManager: React.FC = () => {
  const [data, setData] = useState<ResourceManagerData | null>(null);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ResourceForm>(emptyForm());
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkResources, setBulkResources] = useState<ParsedResource[]>([]);
  const [bulkImagePreview, setBulkImagePreview] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [documentReading, setDocumentReading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

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
  const nextSortOrder = useMemo(
    () => Math.max(0, ...(selectedStage?.resources ?? []).map((resource) => resource.sortOrder)) + 1,
    [selectedStage]
  );
  const resetForm = (stageId = selectedStageId) => {
    setEditingId('');
    setForm(emptyForm(stageId));
    setShowManualForm(false);
  };

  const startEdit = (resource: ManagedResource) => {
    setEditingId(resource.id);
    setShowManualForm(true);
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

  const updateBulkResource = (
    localId: string,
    field: keyof Pick<ParsedResource, 'term' | 'explanation' | 'example' | 'sortOrder' | 'isActive'>,
    value: string | number | boolean
  ) => {
    setBulkResources((current) =>
      current.map((resource) =>
        resource.localId === localId ? { ...resource, [field]: value } : resource
      )
    );
  };

  const deleteBulkResource = (localId: string) => {
    setBulkResources((current) => current.filter((resource) => resource.localId !== localId));
  };

  const addBulkResource = () => {
    setBulkResources((current) => [
      ...current,
      {
        localId: `manual-${Date.now()}`,
        term: '',
        explanation: '',
        example: '',
        sortOrder: nextSortOrder + current.length,
        isActive: true
      }
    ]);
  };

  const updateBulkText = (text: string) => {
    setBulkText(text);
    setBulkResources(parseResourceRows(text, nextSortOrder));
  };

  const runLocalOcr = async (file: File) => {
    const result = await Tesseract.recognize(file, 'chi_sim+eng', {
      logger: (message) => {
        if (typeof message.progress === 'number') {
          setOcrProgress(Math.max(0, Math.min(100, Math.round(message.progress * 100))));
        }
        if (message.status) {
          setOcrStatus(`本地 OCR：${message.status}`);
        }
      }
    });
    const text = result.data.text.trim();
    setBulkText(text);
    if (!text) {
      updateBulkText(text);
      setOcrStatus('未识别到有效文本');
      return;
    }
    const localResources = parseResourceRows(text, nextSortOrder);
    setBulkResources(localResources);
    setOcrProgress(100);
    setOcrStatus(`本地 OCR 解析完成：${localResources.length} 条`);
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || '');
        resolve(value.includes(',') ? value.split(',').pop() || '' : value);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });

  const handleBulkDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setDocumentReading(true);
    setError('');
    setOcrStatus(`正在读取文档：${file.name}`);

    try {
      let text = '';
      if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
        text = await file.text();
      } else {
        const contentBase64 = await readFileAsBase64(file);
        const result = await apiRequest<ResourceImportFileTextResponse>(
          '/api/admin/resources/import-file-text',
          {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type,
              contentBase64
            })
          }
        );
        text = result.text;
      }

      updateBulkText(text);
      setOcrProgress(100);
      setOcrStatus(`文档读取完成：${parseResourceRows(text, nextSortOrder).length} 条中文词汇`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档读取失败');
      setOcrStatus('文档读取失败');
    } finally {
      setDocumentReading(false);
    }
  };

  const handleBulkImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setOcrRunning(true);
    setOcrProgress(0);
    setOcrStatus('正在读取图片并进行本地 OCR');
    setError('');

    try {
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
      });
      setBulkImagePreview(imageDataUrl);
      setOcrProgress(10);
      await runLocalOcr(file);
      setOcrProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片识别失败');
      setOcrStatus('识别失败');
    } finally {
      setOcrRunning(false);
      setOcrProgress(100);
    }
  };

  const importBulkResources = async () => {
    const resourcesToImport = bulkResources
      .map(({ localId: _localId, ...resource }) => ({
        ...resource,
        term: resource.term.trim(),
        explanation: resource.explanation.trim() || resource.term.trim(),
        example: resource.example.trim()
      }))
      .filter((resource) => resource.term);

    if (!selectedStageId || !resourcesToImport.length) return;

    setBulkSaving(true);
    setError('');

    try {
      await apiRequest('/api/admin/resources/bulk', {
        method: 'POST',
        body: JSON.stringify({
          stageId: selectedStageId,
          type: form.type,
          replaceExisting,
          resources: resourcesToImport
        })
      });
      setBulkText('');
      setBulkResources([]);
      setBulkImagePreview('');
      setReplaceExisting(false);
      await apiRequest<ResourceManagerData>('/api/admin/resources/manager').then((payload) => {
        setData(payload);
        setSelectedStageId(selectedStageId);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量导入失败');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Resource Manager</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">批量增加教学词条</h3>
            <p className="mt-2 text-sm text-slate-400">
              先选择业务阶段，再上传截图或粘贴 OCR 文本；确认导入草稿后批量入库。
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
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

        <section className="grid grid-cols-1 gap-6">
          <div className="order-3 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    Existing Resources
                  </p>
                  <h4 className="mt-1 text-xl font-black text-slate-900">
                    {selectedStage?.titleZh ?? '请选择阶段'} 已有词条
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">用于导入前后检查，不是本页主要编辑区。</p>
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

          <div className="order-1 space-y-6">
            <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    Batch Import
                  </p>
                  <h4 className="mt-1 text-lg font-black text-slate-900">文档批量导入</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    当前阶段：{selectedStage ? `${selectedStage.sortOrder}. ${selectedStage.titleZh}` : '未选择'}
                  </p>
                </div>
                <Upload className="text-indigo-500" size={20} />
              </div>

              <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-5 text-center transition hover:bg-indigo-50">
                    {documentReading ? (
                      <Loader2 className="animate-spin text-indigo-500" size={24} />
                    ) : (
                      <FileText className="text-indigo-500" size={24} />
                    )}
                    <span className="mt-2 text-sm font-black text-slate-700">
                      {documentReading ? '文档读取中...' : '上传 Word / Text 文档'}
                    </span>
                    <span className="mt-1 text-xs leading-5 text-slate-400">
                      优先使用教师整理好的文本资料，系统只提取每行中文词汇。
                    </span>
                    <input
                      type="file"
                      accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleBulkDocument}
                      className="hidden"
                    />
                  </label>

                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center transition hover:bg-slate-100">
                    {ocrRunning ? (
                      <Loader2 className="animate-spin text-indigo-500" size={24} />
                    ) : (
                      <ImagePlus className="text-indigo-500" size={24} />
                    )}
                    <span className="mt-2 text-sm font-black text-slate-700">
                      {ocrRunning ? '截图识别中...' : '上传截图辅助 OCR'}
                    </span>
                    <span className="mt-1 text-xs leading-5 text-slate-400">
                      图片识别只作为补充，识别后仍可在右侧手动校正。
                    </span>
                    <input type="file" accept="image/*" onChange={handleBulkImage} className="hidden" />
                  </label>

                  {(ocrRunning || documentReading || ocrStatus) && (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>{ocrStatus || '正在读取资料'}</span>
                        {(ocrRunning || documentReading) && <Loader2 className="animate-spin" size={14} />}
                      </div>
                      {ocrRunning && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {bulkImagePreview && (
                    <div className="space-y-4">
                      <img
                        src={bulkImagePreview}
                        alt="商务词汇截图预览"
                        className="max-h-[420px] w-full rounded-2xl border border-slate-100 bg-white object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-black text-slate-500">文本校正</p>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkText('');
                          setBulkResources([]);
                          setOcrStatus('');
                          setOcrProgress(0);
                        }}
                        className="text-xs font-black text-slate-400 hover:text-rose-500"
                      >
                        清空文本
                      </button>
                    </div>
                    <textarea
                      value={bulkText}
                      onChange={(event) => updateBulkText(event.target.value)}
                      placeholder={'每行一条，例如：\n1\t家居用品\tjiājū yòngpǐn\thome comforts\n2\t设备\tshèbèi\tequipment; device'}
                      className="h-44 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>

                <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-400">自动提取结果</p>
                      <p className="mt-1 text-sm font-black text-slate-700">
                        待导入 {bulkResources.length} 条资源，可直接修改或删除
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-black text-slate-500">
                        <input
                          type="checkbox"
                          checked={replaceExisting}
                          onChange={(event) => setReplaceExisting(event.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        覆盖本阶段旧词汇
                      </label>
                      <button
                        type="button"
                        onClick={addBulkResource}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-100"
                      >
                        <Plus size={14} />
                        添加
                      </button>
                    </div>
                  </div>

                  {bulkResources.length > 0 ? (
                    <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
                      {bulkResources.map((resource) => (
                        <article
                          key={resource.localId}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600">
                              #{resource.sortOrder}
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-[11px] font-black text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={resource.isActive}
                                  onChange={(event) =>
                                    updateBulkResource(resource.localId, 'isActive', event.target.checked)
                                  }
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                启用
                              </label>
                              <button
                                type="button"
                                onClick={() => deleteBulkResource(resource.localId)}
                                className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"
                                title="删除此条"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.8fr_84px]">
                            <label className="block">
                              <span className="text-[10px] font-black text-slate-400">词汇 / 标题</span>
                              <input
                                value={resource.term}
                                onChange={(event) =>
                                  updateBulkResource(resource.localId, 'term', event.target.value)
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-black text-slate-400">解释</span>
                              <input
                                value={resource.explanation}
                                onChange={(event) =>
                                  updateBulkResource(resource.localId, 'explanation', event.target.value)
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-black text-slate-400">排序</span>
                              <input
                                type="number"
                                min={0}
                                value={resource.sortOrder}
                                onChange={(event) =>
                                  updateBulkResource(resource.localId, 'sortOrder', Number(event.target.value))
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                              />
                            </label>
                          </div>
                          <label className="mt-3 block">
                            <span className="text-[10px] font-black text-slate-400">示例，可选</span>
                            <input
                              value={resource.example}
                              onChange={(event) =>
                                updateBulkResource(resource.localId, 'example', event.target.value)
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
                      上传截图或粘贴 OCR 文本后，会在这里生成可编辑的导入草稿
                    </div>
                  )}
                </section>

                <button
                  type="button"
                  onClick={importBulkResources}
                  disabled={bulkSaving || ocrRunning || documentReading || !selectedStageId || !bulkResources.length}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {bulkSaving ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                  批量导入资源
                </button>
                </div>
              </div>
            </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setShowManualForm((current) => !current)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl px-2 py-2 text-left"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  {editingId ? 'Edit Resource' : 'Manual Resource'}
                </p>
                <h4 className="mt-1 text-lg font-black text-slate-900">
                  {editingId ? '编辑单条资源' : '手动新增资源'}
                </h4>
              </div>
              <Plus
                size={18}
                className={`text-indigo-500 transition ${showManualForm ? 'rotate-45' : ''}`}
              />
            </button>

          {showManualForm && (
          <form onSubmit={saveResource} className="mt-4 border-t border-slate-100 pt-5">
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
          )}
          </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TeachingResourceManager;
