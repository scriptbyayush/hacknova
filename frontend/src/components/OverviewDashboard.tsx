import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, CheckCircle2, Clock, AlertTriangle,
  GitBranch, TrendingUp, Sparkles, ArrowRight, Users,
  FileText, Zap, Target, BarChart3, Send, KanbanSquare, Mic
} from 'lucide-react';
import type { MeetingAnalysisResponse, AppSettings } from '../types';

interface OverviewDashboardProps {
  analysisData: MeetingAnalysisResponse | null;
  backendOnline: boolean;
  settings: AppSettings;
  onNavigate: (tab: string) => void;
}

interface BackendStats {
  total_tasks: number;
  approved: number;
  pending_review: number;
  confirmed_commitments: number;
  suggestions: number;
  active_conflicts: number;
  exported_to_tools: number;
  published_to_github: number;
  total_meetings: number;
  workload_by_member: Record<string, number>;
  status_distribution: Record<string, number>;
  time_saved_minutes: number;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: '#f59e0b',
  todo: '#818cf8',
  in_progress: '#22d3ee',
  in_review: '#a78bfa',
  done: '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  analysisData,
  backendOnline,
  settings,
  onNavigate,
}) => {
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);

  useEffect(() => {
    if (backendOnline && settings.backendUrl && settings.backendUrl !== 'none') {
      fetch(`${settings.backendUrl}/api/stats`)
        .then(r => r.json())
        .then(setBackendStats)
        .catch(() => setBackendStats(null));
    }
  }, [backendOnline, settings.backendUrl]);

  const tasks = analysisData?.tasks || [];
  const total = tasks.length;
  const approved = tasks.filter(t => t.approval_status === 'approved').length;
  const pending = tasks.filter(t => t.approval_status === 'pending').length;
  const confirmed = tasks.filter(t => t.classification === 'confirmed').length;
  const published = tasks.filter(t => t.github_issue_url || t.trello_card_url).length;
  const conflicts = analysisData?.conflict_count || 0;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;

  const stats = backendStats || {
    total_tasks: total,
    approved,
    pending_review: pending,
    confirmed_commitments: confirmed,
    active_conflicts: conflicts,
    exported_to_tools: published,
    published_to_github: tasks.filter(t => t.github_issue_url && !t.github_issue_url.includes('/new')).length,
    total_meetings: 1,
    workload_by_member: {},
    status_distribution: {},
    time_saved_minutes: total * 15,
  };

  // Build workload from local data if no backend
  const workload = Object.keys(stats.workload_by_member || {}).length > 0
    ? (stats.workload_by_member || {})
    : tasks.reduce((acc: Record<string, number>, t) => {
        const name = t.assignee || 'Unassigned';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

  const statusDist = Object.keys(stats.status_distribution || {}).length > 0
    ? (stats.status_distribution || {})
    : tasks.reduce((acc: Record<string, number>, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

  const statCards = [
    {
      label: 'Total Tasks',
      value: stats.total_tasks,
      icon: <FileText size={18} />,
      iconBg: 'rgba(99,102,241,0.15)',
      iconColor: 'var(--indigo-light)',
      onClick: () => onNavigate('approval'),
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: <CheckCircle2 size={18} />,
      iconBg: 'var(--green-bg)',
      iconColor: 'var(--green-2)',
      onClick: () => onNavigate('approval'),
    },
    {
      label: 'Pending Review',
      value: stats.pending_review,
      icon: <Clock size={18} />,
      iconBg: 'var(--amber-bg)',
      iconColor: 'var(--amber-2)',
      onClick: () => onNavigate('approval'),
    },
    {
      label: 'Conflicts',
      value: stats.active_conflicts,
      icon: <AlertTriangle size={18} />,
      iconBg: 'var(--red-bg)',
      iconColor: 'var(--red-2)',
      onClick: () => onNavigate('approval'),
    },
    {
      label: 'Published to GitHub',
      value: stats.published_to_github,
      icon: <GitBranch size={18} />,
      iconBg: 'rgba(255,255,255,0.06)',
      iconColor: 'var(--text-2)',
      onClick: () => onNavigate('github'),
    },
    {
      label: 'Time Saved',
      value: `${Math.round(stats.time_saved_minutes / 60 * 10) / 10}h`,
      icon: <TrendingUp size={18} />,
      iconBg: 'rgba(167,139,250,0.12)',
      iconColor: 'var(--violet)',
      onClick: undefined,
    },
  ];

  const quickActions = [
    {
      title: 'Analyze a Meeting',
      desc: 'Paste transcript or record audio',
      icon: <Mic size={20} />,
      color: 'var(--indigo)',
      bg: 'rgba(99,102,241,0.12)',
      border: 'rgba(99,102,241,0.25)',
      tab: 'studio',
    },
    {
      title: 'Review Tasks',
      desc: `${pending} tasks awaiting approval`,
      icon: <CheckCircle2 size={20} />,
      color: 'var(--amber)',
      bg: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.25)',
      tab: 'approval',
    },
    {
      title: 'Publish to GitHub',
      desc: `${approved} tasks ready to dispatch`,
      icon: <Send size={20} />,
      color: 'var(--green)',
      bg: 'rgba(16,185,129,0.10)',
      border: 'rgba(16,185,129,0.25)',
      tab: 'execution',
    },
    {
      title: 'Project Board',
      desc: `${inProgress} in progress, ${done} done`,
      icon: <KanbanSquare size={20} />,
      color: 'var(--cyan)',
      bg: 'rgba(34,211,238,0.08)',
      border: 'rgba(34,211,238,0.20)',
      tab: 'tracker',
    },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <LayoutDashboard size={18} color="var(--indigo-light)" />
            <span className="section-label">Operations Overview</span>
          </div>
          <h1 className="page-title">
            Welcome to{' '}
            <span className="shimmer">MeetFlow AI</span>
          </h1>
          <p className="page-subtitle">
            {analysisData
              ? `Showing data for: "${analysisData.title}" — ${analysisData.detected_attendees.join(', ')}`
              : 'Meeting-to-Execution Automation Agent for HACKNOVA\'26'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`status-pill ${backendOnline ? 'status-pill-green' : 'status-pill-indigo'}`}>
            <span className={`pulse-dot ${backendOnline ? 'pulse-dot-green' : 'pulse-dot-indigo'}`} />
            {backendOnline ? 'FastAPI Connected' : 'Client-Side AI'}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('studio')}>
            <Sparkles size={13} />
            New Meeting
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            className="stat-card fade-in-up"
            onClick={card.onClick}
            style={{
              cursor: card.onClick ? 'pointer' : 'default',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div
              className="stat-icon"
              style={{ background: card.iconBg, color: card.iconColor }}
            >
              {card.icon}
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} color="var(--text-3)" />
          <span className="section-label">Quick Actions</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onNavigate(action.tab)}
              className="card"
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                background: action.bg,
                border: `1px solid ${action.border}`,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '';
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${action.color}22`, border: `1px solid ${action.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: action.color, flexShrink: 0,
              }}>
                {action.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                  {action.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{action.desc}</div>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: Recent Activity + Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Status Distribution */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BarChart3 size={15} color="var(--text-3)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)' }}>Task Status</span>
          </div>
          {Object.keys(statusDist).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-4)', fontSize: '12px' }}>
              No tasks yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(statusDist).map(([status, countVal]) => {
                const count = Number(countVal);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = STATUS_COLORS[status] || 'var(--text-3)';
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{STATUS_LABELS[status] || status}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color }}>
                        {count} <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: color,
                        borderRadius: '2px', transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Workload */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={15} color="var(--text-3)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)' }}>Team Workload</span>
          </div>
          {Object.keys(workload).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-4)', fontSize: '12px' }}>
              No assignments yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(workload)
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .slice(0, 6)
                .map(([name, countVal], i) => {
                  const count = Number(countVal);
                  const maxCount = Math.max(...Object.values(workload).map(v => Number(v)), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  const colors = ['var(--indigo-light)', 'var(--cyan)', 'var(--green-2)', 'var(--amber-2)', 'var(--violet)', 'var(--red-2)'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: `${color}22`, border: `1px solid ${color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color, flexShrink: 0,
                      }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{name}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color }}>{count}</span>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Recent tasks preview */}
      {tasks.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={15} color="var(--text-3)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)' }}>Recent Tasks</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('approval')}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tasks.slice(0, 5).map(task => (
              <div
                key={task.id}
                onClick={() => onNavigate('approval')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: 'var(--r-lg)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: task.classification === 'confirmed' ? 'var(--green)' :
                               task.classification === 'suggestion' ? 'var(--amber)' : 'var(--blue)',
                }} />
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-4)', flexShrink: 0 }}>{task.assignee}</span>
                <span className={`badge badge-${task.approval_status}`} style={{ flexShrink: 0 }}>
                  {task.approval_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


