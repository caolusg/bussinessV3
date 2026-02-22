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
  name: role === UserRole.TEACHER ? '管理�?' : '新同�?',
  role: role === UserRole.TEACHER ? '导师' : '销售学�?',
  company: '系统模拟账户',
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

  const handleLogin = (user: UserProfile, selectedRole: UserRole) => {
    setCurrentUser(user);
    setRole(selectedRole);
    if (selectedRole === UserRole.TEACHER) {
      navigate('/teacher');
    } else {
      navigate('/profile');
    }
  };

  const handleProfileComplete = (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    setIsProfileModalOpen(false);
    navigate('/dashboard');
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
      alert("恭喜！您已完成所有现有实训阶段�?");
    }
  };

  const handleResourceClick = (title: string) => {
    alert(`正在打开学习资源�?{title}\n(资源库模�鮭�在加载中...)`);
  };

  return (
    <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginView onLogin={handleLogin} />} />
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
    </>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
