import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import WorkflowMap from './components/WorkflowMap';
import TaskCard from './components/TaskCard';
import ResourcePanel from './components/ResourcePanel';
import SimulationInterface from './components/SimulationInterface';
import CoachingReview from './components/CoachingReview';
import GroupDiscussionRoom from './components/GroupDiscussionRoom';
import LoginView from './components/LoginView';
import type { LoginActionPayload, LoginActionResult } from './components/LoginView';
import ProfileSetup from './components/ProfileSetup';
import TeacherDashboard from './components/TeacherDashboard';
import RequireAuth from './components/RequireAuth';
import VerifyEmailPage from './components/VerifyEmailPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { SCENARIO_DB, STAGE_RESOURCES, STAGES } from './constants';
import {
  UserRole,
  UserProfile,
  SubResource,
  Stage,
  StageResourceSet,
  TaskDetail,
  TaskMode,
  ResourceEntry
} from './types';
import { apiRequest } from './utils/apiFetch';

const buildDefaultUser = (role: UserRole): UserProfile => ({
  username: role === UserRole.TEACHER ? 'teacher' : 'student',
  realName: role === UserRole.TEACHER ? '\u7ba1\u7406\u5458' : '\u65b0\u540c\u5b66',
  studentNo: role === UserRole.TEACHER ? '' : '',
  role: role === UserRole.TEACHER ? '\u5bfc\u5e08' : '\u9500\u552e\u5b66\u5458',
  company: '\u7cfb\u7edf\u6a21\u62df\u8d26\u6237',
  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role === UserRole.TEACHER ? 'teacher' : 'student'}`
});

type ContentTask = {
  taskCode: string;
  title: string;
  goal: string;
  subGoal?: string | null;
  tipTitle?: string | null;
  tipContent?: string | null;
};

type ContentResource = {
  id: string;
  type: 'vocabulary' | 'phrases' | 'knowledge';
  term: string;
  explanation: string;
  example?: string | null;
};

type ContentStage = {
  id: string;
  key: string;
  sortOrder: number;
  titleZh: string;
  titleEn?: string | null;
  tasks?: ContentTask[];
  resources?: ContentResource[];
};

const resourceTitleByType: Record<ContentResource['type'], string> = {
  vocabulary: '商务词汇',
  phrases: '常用句式',
  knowledge: '外贸常识'
};

const makeEmptyResourceSet = (): StageResourceSet => ({
  vocabulary: [],
  phrases: [],
  knowledge: []
});

const mapContentStages = (contentStages: ContentStage[]) => {
  const stages: Stage[] = [];
  const tasksByStage: Record<number, TaskDetail> = {};
  const resourcesByStage: Record<number, StageResourceSet> = {};

  for (const stage of contentStages) {
    const stageId = stage.sortOrder;
    const title = `${stage.titleZh}${stage.titleEn ? ` (${stage.titleEn})` : ''}`;

    stages.push({
      id: stageId,
      title,
      status: STAGES.find((item) => item.id === stageId)?.status ?? STAGES[0].status,
      subResources: (['vocabulary', 'phrases', 'knowledge'] as const).map((type) => ({
        id: `${type}-${stageId}`,
        title: resourceTitleByType[type],
        type
      }))
    });

    const task = stage.tasks?.[0];
    if (task) {
      tasksByStage[stageId] = {
        stageId,
        mode: TaskMode.PENDING,
        title,
        taskId: task.taskCode,
        description: task.goal,
        subDescription: task.subGoal ?? undefined,
        feedbackOrTipTitle: task.tipTitle ?? undefined,
        feedbackOrTipContent: task.tipContent ?? ''
      };
    }

    const resourceSet = makeEmptyResourceSet();
    for (const resource of stage.resources ?? []) {
      const entry: ResourceEntry = {
        id: resource.id,
        term: resource.term,
        explanation: resource.explanation,
        example: resource.example ?? undefined
      };
      resourceSet[resource.type].push(entry);
    }
    resourcesByStage[stageId] = resourceSet;
  }

  return { stages, tasksByStage, resourcesByStage };
};

const AppRoutes: React.FC = () => {
  // Global Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [selectedStageId, setSelectedStageId] = useState<number>(1);
  const [selectedResource, setSelectedResource] = useState<{
    stageId: number;
    resource: SubResource;
  } | null>(null);
  const [contentStages, setContentStages] = useState<Stage[]>(STAGES);
  const [contentTasks, setContentTasks] = useState<Record<number, TaskDetail>>({});
  const [contentResources, setContentResources] =
    useState<Record<number, StageResourceSet>>(STAGE_RESOURCES);
  const [contentLoadError, setContentLoadError] = useState<string | null>(null);

  const currentTaskDetail = contentTasks[selectedStageId] || SCENARIO_DB[selectedStageId] || SCENARIO_DB[1];
  const selectedResourceEntries = useMemo(() => {
    if (!selectedResource) return undefined;
    return contentResources[selectedResource.stageId]?.[selectedResource.resource.type];
  }, [contentResources, selectedResource]);
  const navigate = useNavigate();

  const clearAuth = () => {
    localStorage.removeItem('access_token');
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let cancelled = false;
    apiRequest<ContentStage[]>('/api/content/stages')
      .then((stages) => {
        if (cancelled) return;
        const mapped = mapContentStages(stages);
        setContentStages(mapped.stages.length ? mapped.stages : STAGES);
        setContentTasks(mapped.tasksByStage);
        setContentResources({
          ...STAGE_RESOURCES,
          ...mapped.resourcesByStage
        });
        setContentLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setContentLoadError(error instanceof Error ? error.message : '学习内容暂时不可用');
        setContentStages(STAGES);
        setContentTasks({});
        setContentResources(STAGE_RESOURCES);
      });

    return () => {
      cancelled = true;
    };
  }, [role]);

  const handleLogin = async (
    selectedRole: UserRole,
    payload: LoginActionPayload
  ): Promise<LoginActionResult> => {
    let endpoint: string;
    if (selectedRole === UserRole.TEACHER) {
      endpoint = '/api/auth/teacher/login';
    } else {
      const mode = (payload as { mode?: 'login' | 'register' }).mode;
      endpoint =
        mode === 'register'
          ? '/api/auth/student/register'
          : '/api/auth/student/login';
    }

    if (selectedRole === UserRole.STUDENT && 'mode' in payload && payload.mode === 'register') {
      const registerResult = await apiRequest<{
        user: { id: string; username: string; email: string };
        verificationRequired: true;
        delivery?: { mode: 'preview' | 'smtp'; previewUrl?: string };
      }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        },
        { redirectOnUnauthorized: false }
      );

      return {
        kind: 'verification_required',
        identifier: registerResult.user.username,
        email: registerResult.user.email,
        previewUrl: registerResult.delivery?.previewUrl
      };
    }

    const tokenResult = await apiRequest<{ token: string }>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      { redirectOnUnauthorized: false }
    );

    const token = tokenResult.token;
    localStorage.setItem('access_token', token);

    const me = await apiRequest<{
      roles: Array<'student' | 'teacher'>;
      profileCompleted: boolean;
    }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    setRole(me.roles.includes('teacher') ? UserRole.TEACHER : UserRole.STUDENT);

    if (me.roles.includes('teacher')) {
      navigate('/teacher');
    } else if (!me.profileCompleted) {
      navigate('/profile');
    } else {
      navigate('/');
    }

    return { kind: 'logged_in' };
  };

  const handleProfileComplete = async (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    setIsProfileModalOpen(false);

    const token = localStorage.getItem('access_token');
    if (!token) {
      clearAuth();
      navigate('/login', { replace: true });
      return;
    }

    await apiRequest('/api/profile/student', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        realName: updatedProfile.realName,
        studentNo: updatedProfile.studentNo,
        nationality: updatedProfile.nationality ?? '',
        age: updatedProfile.age ?? 0,
        gender: updatedProfile.gender ?? '',
        hskLevel: updatedProfile.hskLevel ?? '',
        major: updatedProfile.major ?? ''
      })
    });

    navigate('/');
  };
  const handleStartSimulation = () => navigate('/simulation');
  const handleExitSimulation = () => navigate('/dashboard');
  const handleTriggerCoaching = () => navigate('/coach');
  const handleRetryFromOverlay = () => navigate('/simulation');
  const handleBackToResources = () => navigate('/dashboard');
  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    setRole(null);
    navigate('/login', { replace: true });
  };

  const handleTriggerGroupDiscussion = () => navigate('/discussion');
  const handleGoToCoachingFromDiscussion = () => navigate('/coach');

  const handleResourceClick = (stageId: number, resource: SubResource) => {
    setSelectedStageId(stageId);
    setSelectedResource({ stageId, resource });
    const resourceId = contentResources[stageId]?.[resource.type]?.[0]?.id;
    if (resourceId) {
      void apiRequest('/api/content/resources/viewed', {
        method: 'POST',
        body: JSON.stringify({ resourceId })
      }).catch(() => undefined);
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/login/student" replace />} />
      <Route path="/login/student" element={<LoginView onLogin={handleLogin} initialRole="student" />} />
      <Route path="/login/teacher" element={<LoginView onLogin={handleLogin} initialRole="teacher" />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route
          path="/profile"
          element={
            <ProfileSetup
              initialProfile={currentUser ?? buildDefaultUser(UserRole.STUDENT)}
              onComplete={handleProfileComplete}
            />
          }
        />
        <Route
          path="/teacher"
          element={
            <TeacherDashboard
              user={currentUser ?? buildDefaultUser(UserRole.TEACHER)}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/simulation"
          element={
            <>
              <SimulationInterface
                task={currentTaskDetail}
                onExit={handleExitSimulation}
                onTriggerCoaching={handleTriggerCoaching}
                onTriggerGroupDiscussion={handleTriggerGroupDiscussion}
              />
              {isProfileModalOpen && currentUser && (
                <ProfileSetup
                  initialProfile={currentUser}
                  onComplete={handleProfileComplete}
                  isModal
                  onClose={() => setIsProfileModalOpen(false)}
                />
              )}
            </>
          }
        />
        <Route
          path="/coach"
          element={
            <CoachingReview
              onClose={() => navigate('/dashboard')}
              onRetry={handleRetryFromOverlay}
              onBackToResources={handleBackToResources}
            />
          }
        />
        <Route
          path="/discussion"
          element={
            <GroupDiscussionRoom
              onClose={() => navigate('/dashboard')}
              onRetry={handleRetryFromOverlay}
              onGoToCoaching={handleGoToCoachingFromDiscussion}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
              <TopBar
                user={currentUser ?? buildDefaultUser(role ?? UserRole.STUDENT)}
                onLogout={handleLogout}
                onManageProfile={() => navigate('/profile')}
              />
              <div className="flex pt-16">
                <Sidebar stages={contentStages} onResourceSelect={handleResourceClick} />
                <main className="ml-[20%] w-[80%] p-8 min-h-[calc(100vh-64px)]">
                  <div className="max-w-6xl mx-auto space-y-6">
                    <WorkflowMap
                      stages={contentStages}
                      currentStageId={selectedStageId}
                      onStageSelect={(stageId) => {
                        setSelectedStageId(stageId);
                        setSelectedResource(null);
                      }}
                    />
                    {selectedResource && (
                      <ResourcePanel
                        stageId={selectedResource.stageId}
                        resource={selectedResource.resource}
                        entries={selectedResourceEntries}
                        stageTitle={contentStages.find((stage) => stage.id === selectedResource.stageId)?.title}
                        onClose={() => setSelectedResource(null)}
                      />
                    )}
                    {contentLoadError && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        学习内容接口暂时不可用，当前使用本地备用内容。
                      </div>
                    )}
                    <TaskCard
                      data={currentTaskDetail}
                      onStartSimulation={handleStartSimulation}
                      onViewCoaching={handleTriggerCoaching}
                    />
                  </div>
                </main>
              </div>
            </div>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
