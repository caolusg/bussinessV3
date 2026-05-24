import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Loader2, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { apiRequest } from '../utils/apiFetch';

type StudentProfile = {
  name?: string | null;
  realName?: string | null;
  studentNo?: string | null;
  nationality?: string | null;
  hskLevel?: string | null;
  major?: string | null;
};

type ManagedStudent = {
  id: string;
  username: string;
  status: string;
  createdAt: string;
  studentAuth?: { idOrName: string } | null;
  studentProfile?: StudentProfile | null;
  teachingGroupMemberships: Array<{
    group: {
      id: string;
      name: string;
      color: string;
      isActive: boolean;
    };
  }>;
};

type TeachingGroup = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  isActive: boolean;
  updatedAt: string;
  members: Array<{
    createdAt: string;
    user: ManagedStudent;
  }>;
};

type GroupManagerData = {
  groups: TeachingGroup[];
  students: ManagedStudent[];
  facets: {
    hskLevel: Record<string, number>;
    major: Record<string, number>;
    nationality: Record<string, number>;
  };
  totals: {
    groupCount: number;
    activeGroupCount: number;
    studentCount: number;
    ungroupedStudentCount: number;
  };
};

type GroupForm = {
  name: string;
  description: string;
  color: string;
  isActive: boolean;
};

const GROUP_COLORS = [
  { value: 'indigo', label: '靛蓝', className: 'bg-indigo-500' },
  { value: 'emerald', label: '绿色', className: 'bg-emerald-500' },
  { value: 'amber', label: '琥珀', className: 'bg-amber-500' },
  { value: 'rose', label: '玫红', className: 'bg-rose-500' },
  { value: 'slate', label: '灰蓝', className: 'bg-slate-500' }
];

const emptyGroupForm: GroupForm = {
  name: '',
  description: '',
  color: 'indigo',
  isActive: true
};

const displayStudentName = (student: ManagedStudent) =>
  student.studentProfile?.realName ||
  student.studentProfile?.name ||
  student.studentAuth?.idOrName ||
  student.username;

const colorClass = (color: string) =>
  GROUP_COLORS.find((item) => item.value === color)?.className ?? 'bg-indigo-500';

const TeachingGroupManager: React.FC = () => {
  const [data, setData] = useState<GroupManagerData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [form, setForm] = useState<GroupForm>(emptyGroupForm);
  const [editingGroupId, setEditingGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    apiRequest<GroupManagerData>('/api/admin/groups/manager')
      .then((payload) => {
        setData(payload);
        const nextGroupId = selectedGroupId || payload.groups.find((group) => group.isActive)?.id || payload.groups[0]?.id || '';
        setSelectedGroupId(nextGroupId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '分组加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedGroupId]);

  const selectedGroup = data?.groups.find((group) => group.id === selectedGroupId) ?? null;
  const memberIds = new Set((selectedGroup?.members ?? []).map((member) => member.user.id));

  const availableStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();
    return (data?.students ?? [])
      .filter((student) => !memberIds.has(student.id))
      .filter((student) => {
        if (!keyword) return true;
        return [
          student.username,
          displayStudentName(student),
          student.studentProfile?.studentNo ?? '',
          student.studentProfile?.major ?? '',
          student.studentProfile?.hskLevel ?? ''
        ].join(' ').toLowerCase().includes(keyword);
      });
  }, [data?.students, memberIds, studentSearch]);

  const visibleAvailableStudents = availableStudents.slice(0, 50);
  const visibleAvailableIds = visibleAvailableStudents.map((student) => student.id);
  const selectedVisibleCount = visibleAvailableIds.filter((id) => selectedStudentIds.includes(id)).length;
  const allVisibleSelected = visibleAvailableIds.length > 0 && selectedVisibleCount === visibleAvailableIds.length;

  const toggleStudentSelection = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((current) => {
      if (checked) return current.includes(studentId) ? current : [...current, studentId];
      return current.filter((id) => id !== studentId);
    });
  };

  const resetForm = () => {
    setEditingGroupId('');
    setForm(emptyGroupForm);
  };

  const startEdit = (group: TeachingGroup) => {
    setEditingGroupId(group.id);
    setForm({
      name: group.name,
      description: group.description ?? '',
      color: group.color,
      isActive: group.isActive
    });
  };

  const saveGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim() || null
      };
      await apiRequest(
        editingGroupId ? `/api/admin/groups/${editingGroupId}` : '/api/admin/groups',
        {
          method: editingGroupId ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        }
      );
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '分组保存失败');
    } finally {
      setSaving(false);
    }
  };

  const disableGroup = async (groupId: string) => {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '分组停用失败');
      setSaving(false);
    }
  };

  const addMember = async () => {
    if (!selectedGroupId || selectedStudentIds.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/admin/groups/${selectedGroupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedStudentIds })
      });
      setSelectedStudentIds([]);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加成员失败');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedGroupId) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/admin/groups/${selectedGroupId}/members/${userId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除成员失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Group Manager</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">班级与分组管理</h3>
            <p className="mt-2 text-sm text-slate-400">
              创建教学分组，管理学生成员，并查看 HSK、专业、国籍等自动分组统计。
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ['学生', data?.totals.studentCount ?? 0],
          ['分组', data?.totals.groupCount ?? 0],
          ['使用中', data?.totals.activeGroupCount ?? 0],
          ['未入组', data?.totals.ungroupedStudentCount ?? 0]
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800">分组列表</h4>
              <div className="flex items-center gap-2">
                {loading && <Loader2 className="animate-spin text-indigo-500" size={16} />}
                <button
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-100"
                >
                  <Plus size={13} />
                  新建
                </button>
              </div>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {(data?.groups ?? []).map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                    selectedGroupId === group.id
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-black">
                      <span className={`h-2.5 w-2.5 rounded-full ${colorClass(group.color)}`} />
                      {group.name}
                    </span>
                    <span className="text-xs font-black">{group.members.length}</span>
                  </div>
                  <p className={`mt-1 line-clamp-1 text-xs ${selectedGroupId === group.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {group.isActive ? '启用' : '已停用'} · {group.description || '无说明'}
                  </p>
                </button>
              ))}
              {!data?.groups.length && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">
                  暂无分组，右侧可以新建。
                </div>
              )}
            </div>
          </div>

          <form onSubmit={saveGroup} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  {editingGroupId ? 'Edit Group' : 'New Group'}
                </p>
                <h4 className="mt-1 text-base font-black text-slate-900">
                  {editingGroupId ? '编辑当前分组' : '新建分组'}
                </h4>
              </div>
              <Users className="text-indigo-500" size={18} />
            </div>

            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                placeholder="分组名称，如 HSK4 强化组"
              />
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                placeholder="分组说明、教学目标或筛选标准"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                >
                  {GROUP_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
                <select
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="true">使用中</option>
                  <option value="false">已归档</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 hover:bg-slate-50"
              >
                清空
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                {editingGroupId ? '保存' : '创建'}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-black text-slate-800">学生概览</h4>
            {[
              ['HSK', data?.facets.hskLevel ?? {}],
              ['专业', data?.facets.major ?? {}],
              ['国籍', data?.facets.nationality ?? {}]
            ].map(([label, facet]) => (
              <div key={String(label)} className="mt-4">
                <p className="text-[10px] font-black text-slate-400">{String(label)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(facet as Record<string, number>).map(([key, count]) => (
                    <span key={key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      {key} {count}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Members</p>
                <h4 className="mt-1 text-xl font-black text-slate-900">
                  {selectedGroup?.name ?? '请选择分组'}
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  当前 {selectedGroup?.members.length ?? 0} 名学生
                </p>
              </div>
              {selectedGroup && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selectedGroup)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Edit3 size={14} />
                    编辑
                  </button>
                  {selectedGroup.isActive && (
                    <button
                      onClick={() => disableGroup(selectedGroup.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 size={14} />
                      停用
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-h-[520px] divide-y divide-slate-100">
              {(selectedGroup?.members ?? []).map((member) => (
                <div key={member.user.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{displayStudentName(member.user)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {member.user.username} · {member.user.studentProfile?.studentNo || '无学号'} · {member.user.status}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                        {member.user.studentProfile?.hskLevel || 'HSK 未填'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                        {member.user.studentProfile?.major || '专业未填'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                        {member.user.studentProfile?.nationality || '国籍未填'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(member.user.id)}
                    disabled={saving}
                    className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    title="移出分组"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {selectedGroup && selectedGroup.members.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-400">
                  这个分组还没有学生。请在右侧搜索并批量加入。
                </div>
              )}
            </div>

            <aside className="border-t border-slate-100 bg-slate-50 p-5 lg:border-l lg:border-t-0">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Add Students</p>
                    <h4 className="mt-1 text-base font-black text-slate-900">添加学生</h4>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">
                    已选 {selectedStudentIds.length}
                  </span>
                </div>
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="按姓名、账号、学号搜索"
                  />
                </div>
                <div className="mb-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      disabled={visibleAvailableIds.length === 0}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedStudentIds((current) => {
                          const next = new Set(current);
                          visibleAvailableIds.forEach((id) => {
                            if (checked) next.add(id);
                            else next.delete(id);
                          });
                          return Array.from(next);
                        });
                      }}
                    />
                    选择当前结果
                  </label>
                  <span>{selectedVisibleCount}/{visibleAvailableIds.length}</span>
                </div>
                <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
                  {visibleAvailableStudents.map((student) => {
                    const checked = selectedStudentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                          checked ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleStudentSelection(student.id, event.target.checked)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-black">{displayStudentName(student)}</span>
                          <span className="mt-1 block truncate text-xs text-slate-400">
                            {student.username} · {student.studentProfile?.hskLevel || 'HSK 未填'} · {student.studentProfile?.major || '专业未填'}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {!visibleAvailableStudents.length && (
                    <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-400">
                      没有可加入的学生。
                    </div>
                  )}
                </div>
                <button
                  onClick={addMember}
                  disabled={selectedStudentIds.length === 0 || saving || !selectedGroup}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  加入当前分组
                </button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TeachingGroupManager;
