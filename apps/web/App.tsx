
import React, { useState } from 'react';
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
import { TaskMode, UserRole, UserProfile } from './types';

const App: React.FC = () => {
  // Global Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<'LOGIN' | 'PROFILE_SETUP' | 'DASHBOARD' | 'SIMULATION' | 'COACHING' | 'GROUP_DISCUSSION' | 'TEACHER_ADMIN'>('LOGIN');
  const [selectedStageId, setSelectedStageId] = useState<number>(2);

  const currentTaskDetail = SCENARIO_DB[selectedStageId] || SCENARIO_DB[2];

  const handleLogin = (user: UserProfile, selectedRole: UserRole) => {
    setCurrentUser(user);
    setRole(selectedRole);
    if (selectedRole === UserRole.TEACHER) {
      setViewMode('TEACHER_ADMIN');
    } else {
      setViewMode('PROFILE_SETUP');
    }
  };

  const handleProfileComplete = (updatedProfile: UserProfile) => {
    setCurrentUser(updatedProfile);
    setIsProfileModalOpen(false);
    if (viewMode === 'PROFILE_SETUP') setViewMode('DASHBOARD');
  };

  const handleStartSimulation = () => setViewMode('SIMULATION');
  const handleExitSimulation = () => setViewMode('DASHBOARD');
  const handleTriggerCoaching = () => setViewMode('COACHING');
  const handleCloseCoaching = () => {
    // If we closed from a simulation context, go back to simulation, otherwise dashboard
    if (viewMode === 'COACHING' || viewMode === 'GROUP_DISCUSSION') {
      setViewMode('SIMULATION');
    } else {
      setViewMode('DASHBOARD');
    }
  };
  const handleRetryFromOverlay = () => setViewMode('SIMULATION');
  const handleBackToResources = () => setViewMode('DASHBOARD');
  const handleLogout = () => {
    setCurrentUser(null);
    setRole(null);
    setViewMode('LOGIN');
  };
  
  const handleTriggerGroupDiscussion = () => setViewMode('GROUP_DISCUSSION');
  const handleGoToCoachingFromDiscussion = () => setViewMode('COACHING');

  const handleNextStage = () => {
    const nextId = selectedStageId + 1;
    if (SCENARIO_DB[nextId]) {
      setSelectedStageId(nextId);
    } else {
      alert("恭喜！您已完成所有现有实训阶段。");
    }
  };

  const handleResourceClick = (title: string) => {
    alert(`正在打开学习资源：${title}\n(资源库模块正在加载中...)`);
  };

  // View Routing Logic
  if (viewMode === 'LOGIN') {
    return <LoginView onLogin={handleLogin} />;
  }

  if (viewMode === 'PROFILE_SETUP' && currentUser) {
    return <ProfileSetup initialProfile={currentUser} onComplete={handleProfileComplete} />;
  }

  if (viewMode === 'TEACHER_ADMIN') {
    return <TeacherDashboard user={currentUser!} onLogout={handleLogout} />;
  }

  if (viewMode === 'SIMULATION') {
    return (
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
    );
  }

  if (viewMode === 'COACHING') {
    return (
      <CoachingReview 
        onClose={() => setViewMode('DASHBOARD')}
        onRetry={handleRetryFromOverlay}
        onBackToResources={handleBackToResources}
      />
    );
  }

  if (viewMode === 'GROUP_DISCUSSION') {
    return (
      <GroupDiscussionRoom 
        onClose={() => setViewMode('DASHBOARD')} 
        onRetry={handleRetryFromOverlay}
        onGoToCoaching={handleGoToCoachingFromDiscussion}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <TopBar 
        user={currentUser!} 
        onLogout={handleLogout} 
        onManageProfile={() => role === UserRole.STUDENT && setIsProfileModalOpen(true)}
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
      {isProfileModalOpen && currentUser && (
        <ProfileSetup 
          initialProfile={currentUser} 
          onComplete={handleProfileComplete} 
          isModal 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
