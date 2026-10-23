import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TranscriptStudio } from './components/TranscriptStudio';
import { ApprovalDashboard } from './components/ApprovalDashboard';
import { ExecutionHub } from './components/ExecutionHub';
import { ProgressTracker } from './components/ProgressTracker';
import { SlideDeckModal } from './components/SlideDeckModal';
import { SettingsModal } from './components/SettingsModal';
import type { MeetingAnalysisResponse, TaskItem, AppSettings } from './types';
import { INITIAL_MEETING_DATA } from './mockData';
import { checkBackendHealth } from './api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'approval' | 'execution' | 'tracker'>('approval');
  const [analysisData, setAnalysisData] = useState<MeetingAnalysisResponse | null>(INITIAL_MEETING_DATA);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);

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
      githubRepo: 'hacknova-team/meetflow-core',
      trelloKey: '',
      trelloToken: '',
      trelloBoardId: '',
      trelloListId: '',
      backendUrl: 'none'
    };
  });

  // Check backend health on mount and periodically
  useEffect(() => {
    const check = async () => {
      const isOnline = await checkBackendHealth(settings.backendUrl);
      setBackendOnline(isOnline);
    };
    check();
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
    const conflictCount = updatedTasks.reduce((acc, t) => acc + t.conflicts.length, 0);

    setAnalysisData({
      ...analysisData,
      tasks: updatedTasks,
      confirmed_count: confirmedCount,
      suggestion_count: suggestionCount,
      unresolved_count: unresolvedCount,
      conflict_count: conflictCount
    });
  };

  const handleLoadSlideDemo = () => {
    setAnalysisData(INITIAL_MEETING_DATA);
    setActiveTab('approval');
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
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onLoadSlideDemo={handleLoadSlideDemo}
      />

      {/* Main Content Body */}
      <main style={{ flex: 1, paddingBottom: '60px' }}>
        {activeTab === 'studio' && (
          <TranscriptStudio
            settings={settings}
            analysisData={analysisData}
            onAnalysisComplete={(res) => {
              setAnalysisData(res);
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
          />
        )}

        {activeTab === 'tracker' && (
          <ProgressTracker
            analysisData={analysisData}
            onUpdateTasks={handleUpdateTasks}
          />
        )}
      </main>

      {/* Presentation Pitch Deck Fullscreen Viewer */}
      <SlideDeckModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        onJumpToTab={(tab: string) => {
          setActiveTab(tab as any);
        }}
      />

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
