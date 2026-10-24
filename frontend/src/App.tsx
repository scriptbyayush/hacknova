import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TranscriptStudio } from './components/TranscriptStudio';
import { ApprovalDashboard } from './components/ApprovalDashboard';
import { ExecutionHub } from './components/ExecutionHub';
import { ProgressTracker } from './components/ProgressTracker';
import { SettingsModal } from './components/SettingsModal';
import type { MeetingAnalysisResponse, TaskItem, AppSettings } from './types';
import { INITIAL_MEETING_DATA } from './mockData';
import { checkBackendHealth } from './api';
import { saveMeetingToFirestore, saveTasksToFirestore, loadLatestMeetingFromFirestore, saveAuditLogToFirestore } from './firebase';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'approval' | 'execution' | 'tracker'>('approval');
  const [analysisData, setAnalysisData] = useState<MeetingAnalysisResponse | null>(INITIAL_MEETING_DATA);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('meetflow_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return {
      llmProvider: 'gemini',
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      openaiApiKey: '',
      githubToken: '',
      githubRepo: 'scriptbyayush/hacknova',
      trelloKey: '',
      trelloToken: '',
      trelloBoardId: '',
      trelloListId: '',
      backendUrl: 'none',
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      googleRedirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://meetflow.vipto.in/',
      googleConnected: true
    };
  });

  // Check backend health and load Firestore cache on mount
  useEffect(() => {
    const check = async () => {
      const isOnline = await checkBackendHealth(settings.backendUrl);
      setBackendOnline(isOnline);
    };
    check();

    // Check Cloud Firestore for any previously saved meetings
    loadLatestMeetingFromFirestore().then((remoteMeeting) => {
      if (remoteMeeting && remoteMeeting.tasks && remoteMeeting.tasks.length > 0) {
        const normalizedTasks = remoteMeeting.tasks.map(t => ({
          ...t,
          conflicts: Array.isArray(t.conflicts) ? t.conflicts : [],
          tags: Array.isArray(t.tags) ? t.tags : []
        }));
        setAnalysisData({
          ...remoteMeeting,
          tasks: normalizedTasks,
          conflict_count: remoteMeeting.conflict_count ?? normalizedTasks.reduce((acc, t) => acc + t.conflicts.length, 0)
        });
      }
    }).catch(() => {});

    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [settings.backendUrl]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('meetflow_settings', JSON.stringify(newSettings));
  };

  const handleUpdateTasks = (updatedTasks: TaskItem[]) => {
    if (!analysisData) return;
    const confirmedCount = updatedTasks.filter(t => t.classification === 'confirmed').length;
    const suggestionCount = updatedTasks.filter(t => t.classification === 'suggestion').length;
    const unresolvedCount = updatedTasks.filter(t => t.classification === 'question').length;
    const conflictCount = updatedTasks.reduce((acc, t) => acc + (t.conflicts?.length || 0), 0);

    const updated = {
      ...analysisData,
      tasks: updatedTasks,
      confirmed_count: confirmedCount,
      suggestion_count: suggestionCount,
      unresolved_count: unresolvedCount,
      conflict_count: conflictCount
    };

    setAnalysisData(updated);
    saveTasksToFirestore(analysisData.meeting_id, updatedTasks);
    saveAuditLogToFirestore({
      action: 'tasks_review_updated',
      meetingId: analysisData.meeting_id,
      details: { totalTasks: updatedTasks.length, confirmedCount, suggestionCount }
    });
  };


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        analysisData={analysisData}
        backendOnline={backendOnline}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Body */}
      <main style={{ flex: 1, paddingBottom: '60px' }}>
        {activeTab === 'studio' && (
          <TranscriptStudio
            settings={settings}
            analysisData={analysisData}
            onAnalysisComplete={(res) => {
              setAnalysisData(res);
              saveMeetingToFirestore(res);
              setActiveTab('approval');
            }}
          />
        )}

        {activeTab === 'approval' && (
          <ApprovalDashboard
            analysisData={analysisData}
            onUpdateTasks={handleUpdateTasks}
            onProceedToExecution={() => setActiveTab('execution')}
          />
        )}

        {activeTab === 'execution' && (
          <ExecutionHub
            analysisData={analysisData}
            settings={settings}
            onUpdateTasks={handleUpdateTasks}
            onNavigateToReview={() => setActiveTab('approval')}
          />
        )}

        {activeTab === 'tracker' && (
          <ProgressTracker
            analysisData={analysisData}
            onUpdateTasks={handleUpdateTasks}
          />
        )}
      </main>


      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

    </div>
  );
};

export default App;
