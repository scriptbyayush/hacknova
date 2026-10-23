import React from 'react';
import { 
  Bot, Mic, CheckCircle2, Send, KanbanSquare, 
  Presentation, Settings, Sparkles, AlertTriangle 
} from 'lucide-react';
import type { MeetingAnalysisResponse } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  analysisData: MeetingAnalysisResponse | null;
  backendOnline: boolean;
  onOpenSettings: () => void;
  onOpenPresentation: () => void;
  onLoadSlideDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  analysisData,
  backendOnline,
  onOpenSettings,
  onOpenPresentation,
  onLoadSlideDemo
}) => {
  const pendingCount = analysisData?.tasks.filter(t => t.approval_status === 'pending').length || 0;
  const conflictCount = analysisData?.conflict_count || 0;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(7, 9, 14, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          <Bot size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MeetFlow AI
            </span>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: 700, 
              padding: '2px 8px', 
              borderRadius: '9999px', 
              background: 'rgba(99, 102, 241, 0.15)', 
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              HACKNOVA'26
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Meeting-to-Execution Automation Agent
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(18, 24, 40, 0.6)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        <button
          onClick={() => setActiveTab('studio')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'studio' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'studio' ? '#ffffff' : 'var(--text-secondary)'
          }}
        >
          <Mic size={16} />
          <span>Meeting Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'approval' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'approval' ? '#ffffff' : 'var(--text-secondary)'
          }}
        >
          <CheckCircle2 size={16} />
          <span>Review & Approval</span>
          {pendingCount > 0 && (
            <span style={{
              fontSize: '0.7rem',
              padding: '1px 6px',
              borderRadius: '999px',
              background: '#f59e0b',
              color: '#000000',
              fontWeight: 800
            }}>
              {pendingCount}
            </span>
          )}
          {conflictCount > 0 && (
            <span 
              title={`${conflictCount} active conflicts`}
              style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '999px',
                background: '#ef4444',
                color: '#ffffff',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <AlertTriangle size={10} />
              {conflictCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('execution')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'execution' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'execution' ? '#ffffff' : 'var(--text-secondary)'
          }}
        >
          <Send size={16} />
          <span>Execution & Sync</span>
        </button>

        <button
          onClick={() => setActiveTab('tracker')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'tracker' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'tracker' ? '#ffffff' : 'var(--text-secondary)'
          }}
        >
          <KanbanSquare size={16} />
          <span>Kanban & Tracking</span>
        </button>
      </nav>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Quick Demo Button */}
        <button
          onClick={onLoadSlideDemo}
          className="btn btn-secondary btn-sm"
          title="Instantly run benchmark slide scenario"
          style={{ border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.1)' }}
        >
          <Sparkles size={14} color="#818cf8" />
          <span>Slide 9 Demo</span>
        </button>

        {/* Pitch Deck presentation viewer */}
        <button
          onClick={onOpenPresentation}
          className="btn btn-secondary btn-sm"
          style={{ border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.1)' }}
        >
          <Presentation size={14} color="#06b6d4" />
          <span>Pitch Deck</span>
        </button>

        {/* Backend health status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          padding: '6px 10px',
          borderRadius: '8px',
          background: backendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: backendOnline ? '#34d399' : '#fbbf24',
          border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: backendOnline ? '#10b981' : '#f59e0b',
            boxShadow: `0 0 8px ${backendOnline ? '#10b981' : '#f59e0b'}`
          }} />
          <span>{backendOnline ? 'FastAPI Connected' : 'Local Sandbox Mode'}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px', borderRadius: '8px' }}
          title="Configure API Keys & Integrations"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
