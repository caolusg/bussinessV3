import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import WorkflowMap from './components/WorkflowMap';
import TaskCard from './components/TaskCard';
import SimulationInterface from './components/SimulationInterface';
import CoachingReview from './components/CoachingReview';
import GroupDiscussionRoom from './components/GroupDiscussionRoom';
import LoginView from './components/LoginView';
import ProfileSetup from './components/ProfileSetup';
import TeacherDashboard from './components/TeacherDashboard';
import { SCENARIO_DB } from './constants';
import { UserRole, UserProfile } from './types';

const buildDefaultUser = (role: UserRole): UserProfile => ({
  username: role === UserRole.TEACHER ? 'teacher' : 'student',
  realName: role === UserRole.TEACHER ? '\u7ba1\u7406\u5458' : '\u65b0\u540c\u5b66',
  studentNo: role === UserRole.TEACHER ? '' : '',
  role: role === UserRole.TEACHER ? '\u5bfc\u5e08' : '\u9500\u552e\u5b66\u5458',
  company: '\u7cfb\u7edf\u6a21\u62df\u8d26\u6237',
  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role === UserRole.TEACHER ? 'teacher' : 'student'}`
});

const AppRoutes: React.FC = () => {
  // Global Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [selectedStageId, setSelectedStageId] = useState<number>(2);

  const currentTaskDetail = SCENARIO_DB[selectedStageId] || SCENARIO_DB[2];
  const navigate = useNavigate();

  const clearAuth = () => {
    localStorage.removeItem('access_token');
  };

  const apiFetch = async <T,>(path: string, options: RequestInit = {}) => {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
      }
    });

    if (res.status === 401) {
      clearAuth();
      navigate('/login/student');
      throw new Error('UNAUTHORIZED');
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const rawMessage = data?.error ?? data?.message ?? res.statusText ?? '';
      let message =
        typeof rawMessage === 'string' && rawMessage.trim().length > 0
          ? rawMessage
          : '\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
      if (res.status === 401) {
        message = '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef';
      }
      switch (message) {
        case 'UNAUTHORIZED':
        case 'INVALID_CREDENTIALS':
        case 'Unauthorized':
        case 'USER_NOT_FOUND':
        case 'User not found':
          message = '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef';
          break;
        case 'USERNAME_TAKEN':
        case 'Username already exists':
          message = '\u7528\u6237\u540d\u5df2\u5b58\u5728';
          break;
        default:
          break;
      }
      const error = new Error(message) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    if (data && typeof data === 'object' && 'ok' in data) {
      if (data.ok === false) {
        const rawMessage = data?.error ?? data?.message ?? '';
        let message =
          typeof rawMessage === 'string' && rawMessage.trim().length > 0
            ? rawMessage
            : '\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
        if (res.status === 401) {
          message = '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef';
        }
        switch (message) {
          case 'UNAUTHORIZED':
          case 'INVALID_CREDENTIALS':
          case 'Unauthorized':
          case 'USER_NOT_FOUND':
          case 'User not found':
            message = '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef';
            break;
          case 'USERNAME_TAKEN':
          case 'Username already exists':
            message = '\u7528\u6237\u540d\u5df2\u5b58\u5728';
            break;
          default:
            break;
        }
        const error = new Error(message) as Error & { status?: number };
        error.status = res.status;
        throw error;
      }
      return (data.data ?? null) as T;
    }

    return data as T;
  };

  const handleLogin = async (
    selectedRole: UserRole,
    payload:
      | { username: string; password: string; mode: 'login' | 'register'; confirmPassword?: string }
      | { username: string; password: string }
  ) => {
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

    const tokenResult = await apiFetch<{ token: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const token = tokenResult.token;
    localStorage.setItem('access_token', token);

    const me = await apiFetch<{
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
  };

  const handleProfileComplete = async (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    setIsProfileModalOpen(false);

    const token = localStorage.getItem('access_token');
    if (!token) {
      clearAuth();
      navigate('/login/student');
      return;
    }

    await apiFetch('/api/profile/student', {
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
    setCurrentUser(null);
    setRole(null);
    navigate('/login');
  };

  const handleTriggerGroupDiscussion = () => navigate('/discussion');
  const handleGoToCoachingFromDiscussion = () => navigate('/coach');

  const handleNextStage = () => {
    const nextId = selectedStageId + 1;
    if (SCENARIO_DB[nextId]) {
      setSelectedStageId(nextId);
    } else {
      alert("\u606d\u559c\uff01\u60a8\u5df2\u5b8c\u6210\u6240\u6709\u73b0\u6709\u5b9e\u8bad\u9636\u6bb5\u3002");
    }
  };

  const handleResourceClick = (title: string) => {
    alert(`\u6b63\u5728\u6253\u5f00\u5b66\u4e60\u8d44\u6e90\uff1a${title}\\n(\u8d44\u6e90\u5e93\u6a21\u5757\u6b63\u5728\u52a0\u8f7d\u4e2d...)`);
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/login/student" replace />} />
      <Route path="/login/student" element={<LoginView onLogin={handleLogin} initialRole="student" />} />
      <Route path="/login/teacher" element={<LoginView onLogin={handleLogin} initialRole="teacher" />} />
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
              <Sidebar onResourceSelect={handleResourceClick} />
              <main className="ml-[20%] w-[80%] p-8 min-h-[calc(100vh-64px)]">
                <div className="max-w-6xl mx-auto space-y-6">
                  <WorkflowMap
                    currentStageId={selectedStageId}
                    onStageSelect={setSelectedStageId}
                  />
                  <TaskCard
                    data={currentTaskDetail}
                    onStartSimulation={handleStartSimulation}
                    onViewCoaching={handleTriggerCoaching}
                    onNextStage={handleNextStage}
                  />
                </div>
              </main>
            </div>
          </div>
        }
      />
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


