import React from 'react';
import {
  Bot, Mic, CheckCircle2, Send, KanbanSquare,
  Presentation, Settings, Sparkles, AlertTriangle,
  LayoutDashboard, GitBranch
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

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeType?: 'amber' | 'red' | 'green';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  analysisData,
  backendOnline,
  onOpenSettings,
  onOpenPresentation,
  onLoadSlideDemo,
}) => {
  const pendingCount = analysisData?.tasks.filter(t => t.approval_status === 'pending').length || 0;
  const conflictCount = analysisData?.conflict_count || 0;
  const dispatchedCount = analysisData?.tasks.filter(t => t.github_issue_url || t.trello_card_url).length || 0;

  const navItems: NavItem[] = [
    { id: 'overview',   label: 'Overview',      icon: <LayoutDashboard size={14} /> },
    { id: 'studio',     label: 'Meeting Studio', icon: <Mic size={14} /> },
    {
      id: 'approval', label: 'Review',     icon: <CheckCircle2 size={14} />,
      badge: pendingCount > 0 ? pendingCount : conflictCount > 0 ? conflictCount : undefined,
      badgeType: pendingCount > 0 ? 'amber' : 'red'
    },
    {
      id: 'execution', label: 'Dispatch',  icon: <Send size={14} />,
      badge: dispatchedCount > 0 ? dispatchedCount : undefined,
      badgeType: 'green'
    },
    { id: 'tracker',    label: 'Board',         icon: <KanbanSquare size={14} /> },
    { id: 'github',     label: 'GitHub',         icon: <GitBranch size={14} /> },
  ];

  return (
    <header className="top-header">
      {/* Brand */}
      <div
        className="header-brand"
        onClick={() => setActiveTab('overview')}
        style={{ cursor: 'pointer' }}
      >
        <div className="header-logo">
          <Bot size={18} color="#ffffff" />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span className="header-title">MeetFlow AI</span>
            <span className="header-badge">HACKNOVA'26</span>
          </div>
          <span className="header-subtitle">Meeting-to-Execution Agent</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="header-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={`nav-badge nav-badge-${item.badgeType || 'amber'}`}>
                {item.badgeType === 'red' && conflictCount > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <AlertTriangle size={8} />
                    {item.badge}
                  </span>
                ) : item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="header-actions">
        {/* Demo shortcut */}
        <button
          onClick={onLoadSlideDemo}
          className="btn btn-secondary btn-sm"
          title="Load HACKNOVA benchmark transcript (Slide 9)"
          style={{ border: '1px solid rgba(99,102,241,0.3)', color: 'var(--indigo-light)' }}
        >
          <Sparkles size={13} />
          <span style={{ display: window.innerWidth > 1100 ? 'inline' : 'none' }}>Slide 9</span>
        </button>

        {/* Pitch deck */}
        <button
          onClick={onOpenPresentation}
          className="btn btn-secondary btn-sm"
          title="Open pitch deck"
          style={{ border: '1px solid rgba(34,211,238,0.25)', color: 'var(--cyan)' }}
        >
          <Presentation size={13} />
          <span style={{ display: window.innerWidth > 1200 ? 'inline' : 'none' }}>Pitch Deck</span>
        </button>

        {/* Backend status */}
        <div className={`status-pill ${backendOnline ? 'status-pill-green' : 'status-pill-indigo'}`}>
          <span className={`pulse-dot ${backendOnline ? 'pulse-dot-green' : 'pulse-dot-indigo'}`} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>
            {backendOnline ? 'FastAPI Online' : 'AI Engine'}
          </span>
        </div>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="btn btn-ghost btn-icon btn-sm"
          title="Settings & API Keys"
          style={{ color: 'var(--text-3)' }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
