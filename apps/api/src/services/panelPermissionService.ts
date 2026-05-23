import { prisma } from '../lib/prisma.js';

export const PANEL_PERMISSIONS = [
  { key: 'users', label: '用户管理', description: '创建用户、分配角色、重置密码' },
  { key: 'resources', label: '教学资源管理', description: '维护阶段词汇、句式和知识资源' },
  { key: 'groups', label: '分组管理', description: '管理教学分组和学生成员' },
  { key: 'student_research', label: '学生数据研究', description: '查看学生聊天记录、AI 调用和行为事件' },
  { key: 'research_ai', label: '自然语言数据分析', description: '使用自然语言查询研究数据' },
  { key: 'click_flow', label: '点击流分区', description: '查看点击流和页面访问记录' },
  { key: 'prompt', label: '提示词工程管理', description: '管理 AI 场景提示词模板' },
  { key: 'system_data', label: '系统数据', description: '查看底层数据表、会话和 AI 调用记录' },
  { key: 'system_admin', label: '系统管理', description: '维护运行配置、AI 设置和系统级参数' }
] as const;

export type PanelPermissionKey = (typeof PANEL_PERMISSIONS)[number]['key'];

export const ALL_PANEL_PERMISSION_KEYS = PANEL_PERMISSIONS.map((panel) => panel.key);
export const LEGACY_PANEL_PERMISSION_KEYS = ['research'] as const;

export function isPanelPermissionKey(value: string): value is PanelPermissionKey {
  return ALL_PANEL_PERMISSION_KEYS.includes(value as PanelPermissionKey);
}

function expandLegacyPanelPermission(panelKey: string): PanelPermissionKey[] {
  if (panelKey === 'research') return ['student_research', 'research_ai'];
  return isPanelPermissionKey(panelKey) ? [panelKey] : [];
}

export async function getUserPanelPermissions(userId: string | undefined) {
  if (!userId) return [];

  const roles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          key: true,
          panelPermissions: { select: { panelKey: true } }
        }
      }
    }
  });

  if (roles.some((item) => item.role.key === 'admin')) return [...ALL_PANEL_PERMISSION_KEYS];

  return Array.from(
    new Set(
      roles
        .flatMap((item) =>
          item.role.panelPermissions.flatMap((permission) => expandLegacyPanelPermission(permission.panelKey))
        )
    )
  );
}

export async function userHasPanelPermission(userId: string | undefined, panelKey: PanelPermissionKey) {
  const permissions = await getUserPanelPermissions(userId);
  return permissions.includes(panelKey);
}

export async function userHasAnyPanelPermission(userId: string | undefined) {
  const permissions = await getUserPanelPermissions(userId);
  return permissions.length > 0;
}
