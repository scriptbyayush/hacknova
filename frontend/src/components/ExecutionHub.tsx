import React, { useState, useEffect, useMemo } from 'react';
import {
  Send, GitBranch, LayoutGrid, CheckCircle2, ExternalLink,
  FileJson, FileSpreadsheet, ShieldAlert, Terminal, Copy,
  Check, Search, Key, Eye, EyeOff, RefreshCw,
  Clock, Calendar, AlertTriangle, ChevronDown,
  ChevronUp, Shield, ArrowRight, Zap,
  Layers, Code
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TaskItem, AppSettings, MeetingAnalysisResponse } from '../types';
import { exportTasksAPI, verifyGitHubRepo } from '../api';

interface ExecutionHubProps {
  analysisData: MeetingAnalysisResponse | null;
  settings: AppSettings;
  onUpdateTasks: (tasks: TaskItem[]) => void;
  onNavigateToReview?: () => void;
}

export const ExecutionHub: React.FC<ExecutionHubProps> = ({
  analysisData,
  settings,
  onUpdateTasks,
  onNavigateToReview,
}) => {
  const [targetPlatform, setTargetPlatform] = useState<'github' | 'trello' | 'sandbox'>('github');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'exported'>('all');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'deliverables' | 'payload' | 'audit'>('deliverables');

  // Inline GitHub Config & Verification
  const [githubRepo, setGithubRepo] = useState(settings.githubRepo || 'scriptbyayush/hacknova');
  const [githubToken, setGithubToken] = useState(settings.githubToken || '');
  const [showToken, setShowToken] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [repoStatus, setRepoStatus] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tasks = analysisData?.tasks || [];
  const approvedTasks = useMemo(() => tasks.filter(t => t.approval_status === 'approved'), [tasks]);
  const pendingTasks = useMemo(() => tasks.filter(t => t.approval_status === 'pending'), [tasks]);

  // Keep repo and token in sync with settings
  useEffect(() => {
    if (settings.githubRepo) setGithubRepo(settings.githubRepo);
    if (settings.githubToken) setGithubToken(settings.githubToken);
  }, [settings]);

  // Auto-select all approved tasks initially
  useEffect(() => {
    if (approvedTasks.length > 0 && selectedTaskIds.length === 0) {
      setSelectedTaskIds(approvedTasks.map(t => t.id));
    }
  }, [approvedTasks]);

  // Task filtering
  const filteredApprovedTasks = useMemo(() => {
    return approvedTasks.filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      const isExported = !!task.github_issue_url || !!task.trello_card_url;
      if (filterMode === 'ready') return matchesSearch && !isExported;
      if (filterMode === 'exported') return matchesSearch && isExported;
      return matchesSearch;
    });
  }, [approvedTasks, searchQuery, filterMode]);

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filteredApprovedTasks.map(t => t.id);
    const allSelected = currentFilteredIds.every(id => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleVerifyRepo = async () => {
    if (!githubRepo.trim()) {
      setRepoStatus({ success: false, message: 'Please enter a repository in owner/repo format.' });
      return;
    }
    setIsVerifying(true);
    setRepoStatus(null);
    try {
      const res = await verifyGitHubRepo(githubRepo, githubToken);
      setIsVerifying(false);
      setRepoStatus(res);
    } catch (err: any) {
      setIsVerifying(false);
      setRepoStatus({ success: false, message: err?.message || 'Connection test timed out.' });
    }
  };

  const handleDispatch = async (idsOverride?: string[], forcePlatform?: 'github' | 'trello' | 'sandbox') => {
    const idsToDispatch = idsOverride || selectedTaskIds;
    if (idsToDispatch.length === 0) return;

    const platform = forcePlatform || targetPlatform;
    setIsExporting(true);
    setLastExportResult(null);

    const activeSettings: AppSettings = {
      ...settings,
      githubRepo: githubRepo.trim() || settings.githubRepo || 'scriptbyayush/hacknova',
      githubToken: githubToken.trim() || settings.githubToken,
    };

    try {
      // 1. Try Backend Dedicated Endpoint if server is online
      let res: any = null;
      if (settings.backendUrl && settings.backendUrl !== 'none' && platform === 'github' && activeSettings.githubToken) {
        try {
          const [owner, repo] = (activeSettings.githubRepo || 'scriptbyayush/hacknova').split('/', 2);
          if (owner && repo) {
            const backendRes = await fetch(`${settings.backendUrl}/api/github/publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_ids: idsToDispatch,
                owner,
                repo,
                token: activeSettings.githubToken,
              }),
              signal: AbortSignal.timeout(12000),
            });
            if (backendRes.ok) {
              res = await backendRes.json();
              res._dispatchedVia = 'FastAPI Backend REST Service';
            }
          }
        } catch (e) {
          console.warn('Backend publish failed, falling back to client export', e);
        }
      }

      // 2. Fallback to exportTasksAPI
      if (!res) {
        res = await exportTasksAPI(idsToDispatch, platform, activeSettings, tasks);
        res._dispatchedVia = platform === 'github' && activeSettings.githubToken ? 'Client GitHub REST API' : 'Sandbox Dispatch Engine';
      }

      setLastExportResult(res);

      // Update tasks state with returned issue or card URLs
      const updated = tasks.map(t => {
        const itemDetail = res.details?.find((d: any) => d.task_id === t.id);
        if (itemDetail && itemDetail.external_url) {
          if (platform === 'github' || platform === 'sandbox') {
            return { ...t, github_issue_url: itemDetail.external_url };
          } else {
            return { ...t, trello_card_url: itemDetail.external_url };
          }
        }
        return t;
      });
      onUpdateTasks(updated);

      // Celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#38bdf8', '#fbbf24', '#a855f7'],
      });
    } catch (err) {
      console.error('Dispatch error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `meetflow-tasks-${Date.now()}.json`;
    a.click();
  };

  const downloadCSV = () => {
    const headers = 'ID,Title,Assignee,Deadline,Classification,Priority,Status,External URL\n';
    const rows = tasks.map(t =>
      `"${t.id}","${t.title}","${t.assignee}","${t.deadline || ''}","${t.classification}","${t.priority}","${t.status}","${t.github_issue_url || t.trello_card_url || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meetflow-tasks-${Date.now()}.csv`;
    a.click();
  };

  // Helper to format clean link buttons avoiding the ugly #new?title=... bug
  const formatExternalLink = (url?: string) => {
    if (!url) return null;
    if (url.includes('/issues/new?')) {
      return {
        type: 'draft',
        badgeText: 'Issue Draft ↗',
        label: 'Open Pre-filled GitHub Draft',
        isLive: false,
      };
    }
    const issueMatch = url.match(/\/issues\/(\d+)/);
    if (issueMatch) {
      return {
        type: 'live',
        badgeText: `Issue #${issueMatch[1]} ↗`,
        label: `Open GitHub Issue #${issueMatch[1]}`,
        issueNumber: issueMatch[1],
        isLive: true,
      };
    }
    if (url.includes('trello.com')) {
      return {
        type: 'trello',
        badgeText: 'Trello Card ↗',
        label: 'Open Trello Card',
        isLive: true,
      };
    }
    return {
      type: 'generic',
      badgeText: 'View Link ↗',
      label: 'Open External URL',
      isLive: false,
    };
  };

  const getAssigneeColor = (name: string) => {
    const colors = [
      { bg: 'rgba(99, 102, 241, 0.2)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.4)' },
      { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' },
      { bg: 'rgba(6, 182, 212, 0.2)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.4)' },
      { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
      { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.35)', dot: '#f43f5e' };
      case 'medium':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.35)', dot: '#f59e0b' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.35)', dot: '#10b981' };
    }
  };

  const exportedCount = tasks.filter(t => t.github_issue_url || t.trello_card_url).length;
  const readyCount = approvedTasks.length - exportedCount;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ─── Hero Header & Pipeline Progress ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#818cf8', display: 'inline-block', boxShadow: '0 0 8px #818cf8' }} />
              Pipeline Steps 7 & 8 • Automated Task Dispatch
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Meeting-to-Execution Automation
            </span>
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#ffffff', margin: '0 0 6px 0' }}>
            Execution & Project Management Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', maxWidth: '780px', margin: 0, lineHeight: 1.5 }}>
            Dispatch validated, human-approved commitments into <strong>GitHub Issues</strong> and <strong>Trello Cards</strong> with assignees, tags, and de-duplication protection.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={downloadCSV}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet size={15} color="#34d399" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={downloadJSON}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
            title="Download raw schema JSON"
          >
            <FileJson size={15} color="#38bdf8" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => handleDispatch(undefined, 'sandbox')}
            disabled={isExporting || approvedTasks.length === 0}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              color: '#fbbf24'
            }}
            title="Test dispatch in sandbox simulator without touching real GitHub issues"
          >
            <Zap size={14} />
            <span>Sandbox Test</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Pills Summary Bar ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Approved Tasks</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              {approvedTasks.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>of {tasks.length}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} color="#34d399" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Synchronized Issues</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399' }}>
              {exportedCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>published</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#22d3ee" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Project Time Saved</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#22d3ee' }}>
              ~{approvedTasks.length * 15} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>mins automated</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fbbf24" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>De-duplication Guard</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Active <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)' }}>Registry</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Target Repository & Live Connection Ribbon ─────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(20, 28, 48, 0.7) 0%, rgba(14, 20, 34, 0.8) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitBranch size={20} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Target Repository
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: githubToken ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: githubToken ? '#34d399' : '#fbbf24',
                    border: `1px solid ${githubToken ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: githubToken ? '#34d399' : '#fbbf24' }} />
                  {githubToken ? 'Live Token Ready' : 'Sandbox / Draft Mode'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <a
                  href={`https://github.com/${githubRepo}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {githubRepo}
                  <ExternalLink size={13} color="var(--text-muted)" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Config Drawer Toggle & Connection Tester */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleVerifyRepo}
              disabled={isVerifying}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
              <span>{isVerifying ? 'Verifying...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <Key size={13} color="#818cf8" />
              <span>Configure Credentials</span>
              {showConfigDrawer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Verification Status Toast */}
        {repoStatus && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: repoStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${repoStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              color: repoStatus.success ? '#34d399' : '#fb7185',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {repoStatus.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{repoStatus.message}</span>
            </div>
            {repoStatus.data?.open_issues_count !== undefined && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {repoStatus.data.open_issues_count} open issues
              </span>
            )}
          </div>
        )}

        {/* Expandable GitHub Credentials Drawer */}
        {showConfigDrawer && (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(10, 15, 26, 0.75)',
              border: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              marginTop: '4px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Repository (owner/repo)
              </label>
              <input
                type="text"
                className="input"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="e.g. scriptbyayush/hacknova"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                GitHub Personal Access Token (PAT)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  className="input"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0 12px' }}
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Requires: <code>repo</code> or <code>Issues: Read and Write</code>. Kept server-side/local; never leaked.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Target Platform Selector (3 Cards) ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* GitHub Option */}
        <div
          onClick={() => setTargetPlatform('github')}
          className="glass-panel"
          style={{
            padding: '20px',
            cursor: 'pointer',
            border: targetPlatform === 'github' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: targetPlatform === 'github' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
            boxShadow: targetPlatform === 'github' ? '0 0 25px rgba(99, 102, 241, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(99, 102, 241, 0.25) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GitBranch size={26} color="#ffffff" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff' }}>GitHub Issues</span>
              {targetPlatform === 'github' && (
                <span className="badge badge-confirmed" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                  Active Dispatcher
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
              Publishes live repository issues with milestone, assignees, and rich markdown meeting contexts.
            </p>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Target: <span style={{ color: '#818cf8' }}>{githubRepo}</span>
            </div>
          </div>
        </div>

        {/* Trello Option */}
        <div
          onClick={() => setTargetPlatform('trello')}
          className="glass-panel"
          style={{
            padding: '20px',
            cursor: 'pointer',
            border: targetPlatform === 'trello' ? '2px solid #06b6d4' : '1px solid var(--border-subtle)',
            background: targetPlatform === 'trello' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
            boxShadow: targetPlatform === 'trello' ? '0 0 25px rgba(6, 182, 212, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.3) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LayoutGrid size={26} color="#06b6d4" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff' }}>Trello Cards</span>
              {targetPlatform === 'trello' && (
                <span className="badge badge-question" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                  Active Dispatcher
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
              Populates sprint Kanban lists with owners, deadlines, checklist deliverables, and labels.
            </p>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Board: <span style={{ color: '#22d3ee' }}>Production Sprint Board</span>
            </div>
          </div>
        </div>

        {/* Sandbox Simulator */}
        <div
          onClick={() => setTargetPlatform('sandbox')}
          className="glass-panel"
          style={{
            padding: '20px',
            cursor: 'pointer',
            border: targetPlatform === 'sandbox' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
            background: targetPlatform === 'sandbox' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
            boxShadow: targetPlatform === 'sandbox' ? '0 0 25px rgba(16, 185, 129, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.3) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Terminal size={26} color="#10b981" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff' }}>Sandbox Dispatcher</span>
              {targetPlatform === 'sandbox' && (
                <span className="badge badge-confirmed" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                  Active Dispatcher
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
              Zero-credential simulation with pre-filled GitHub issue creator URLs and webhook inspections.
            </p>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Mode: <span style={{ color: '#34d399' }}>Instant Local Test</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Task Selection & Batch Action Matrix ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Toolbar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Select Approved Tasks to Dispatch
              </h3>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                {selectedTaskIds.length} of {approvedTasks.length} Selected
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Only tasks validated and approved in the Review stage can be transferred to external trackers.
            </p>
          </div>

          {/* Search & Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search deliverables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px' }}
              />
            </div>

            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === 'all' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: filterMode === 'all' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                All ({approvedTasks.length})
              </button>

              <button
                onClick={() => setFilterMode('ready')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === 'ready' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: filterMode === 'ready' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ready ({readyCount})
              </button>

              <button
                onClick={() => setFilterMode('exported')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === 'exported' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: filterMode === 'exported' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Dispatched ({exportedCount})
              </button>
            </div>

            {approvedTasks.length > 0 && (
              <button onClick={handleSelectAll} className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem', padding: '7px 12px' }}>
                {filteredApprovedTasks.every(t => selectedTaskIds.includes(t.id)) ? 'Deselect Filtered' : 'Select Filtered'}
              </button>
            )}
          </div>
        </div>

        {/* ─── Task List Matrix ─────────────────────────────────────────────────── */}
        {approvedTasks.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={28} color="#fbbf24" />
            </div>

            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                No Approved Deliverables Ready for Dispatch
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: 0 }}>
                {pendingTasks.length > 0
                  ? `There are ${pendingTasks.length} tasks currently awaiting your review and approval in Step 4.`
                  : 'Analyze a meeting transcript in the Meeting Studio to generate actionable deliverables.'}
              </p>
            </div>

            {onNavigateToReview && pendingTasks.length > 0 && (
              <button
                onClick={onNavigateToReview}
                className="btn btn-primary"
                style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Go to Review & Approval Gate</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : filteredApprovedTasks.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No deliverables match your search query or filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredApprovedTasks.map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);
              const linkInfo = formatExternalLink(task.github_issue_url || task.trello_card_url);
              const assigneeStyle = getAssigneeColor(task.assignee || 'Unassigned');
              const priorityStyle = getPriorityStyle(task.priority || 'medium');

              return (
                <div
                  key={task.id}
                  onClick={() => toggleSelectTask(task.id)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(14, 20, 34, 0.6)',
                    border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.45)' : 'var(--border-subtle)'}`,
                    boxShadow: isSelected ? '0 4px 20px rgba(99, 102, 241, 0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    gap: '16px',
                  }}
                >
                  {/* Left: Checkbox & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.25)'}`,
                        background: isSelected ? 'var(--accent-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.96rem', color: '#ffffff' }}>
                          {task.title}
                        </span>

                        {/* Priority Pill */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: priorityStyle.bg,
                            color: priorityStyle.text,
                            border: `1px solid ${priorityStyle.border}`
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: priorityStyle.dot }} />
                          {task.priority.toUpperCase()}
                        </span>

                        {/* Classification Pill */}
                        <span
                          className={`badge ${task.classification === 'confirmed' ? 'badge-confirmed' : 'badge-suggestion'}`}
                          style={{ fontSize: '0.7rem', padding: '1px 8px' }}
                        >
                          {task.classification === 'confirmed' ? 'Confirmed' : 'Suggestion'}
                        </span>
                      </div>

                      {/* Metadata Row */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        {/* Assignee Avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: assigneeStyle.bg,
                              color: assigneeStyle.text,
                              border: `1px solid ${assigneeStyle.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                            }}
                          >
                            {(task.assignee || 'U')[0].toUpperCase()}
                          </div>
                          <span>@{task.assignee || 'Unassigned'}</span>
                        </div>

                        <span style={{ color: 'var(--border-subtle)' }}>•</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>Due: <strong>{task.deadline || 'Pending Target'}</strong></span>
                        </div>

                        {task.estimated_hours && (
                          <>
                            <span style={{ color: 'var(--border-subtle)' }}>•</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} color="var(--text-muted)" />
                              <span>{task.estimated_hours}h effort</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Export State / External Clean Link */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {linkInfo ? (
                      <a
                        href={task.github_issue_url || task.trello_card_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: linkInfo.isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: linkInfo.isLive ? '#34d399' : '#fbbf24',
                          border: `1px solid ${linkInfo.isLive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        title={linkInfo.label}
                      >
                        <CheckCircle2 size={13} />
                        <span>{linkInfo.badgeText}</span>
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        Ready to Dispatch
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Sticky Action Bar / Dispatch Trigger ─────────────────────────────── */}
        <div
          style={{
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Destination:{' '}
            <strong style={{ color: '#ffffff' }}>
              {targetPlatform === 'github'
                ? `GitHub Repository (${githubRepo})`
                : targetPlatform === 'trello'
                ? 'Trello Sprint Board'
                : 'Sandbox Simulator (zero-credential)'}
            </strong>
          </div>

          <button
            onClick={() => handleDispatch()}
            disabled={isExporting || selectedTaskIds.length === 0}
            className="btn btn-primary"
            style={{
              padding: '10px 24px',
              fontSize: '0.94rem',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isExporting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Publishing {selectedTaskIds.length} Deliverable(s)...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>
                  Dispatch {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? 's' : ''} to{' '}
                  {targetPlatform === 'github' ? 'GitHub Issues' : targetPlatform === 'trello' ? 'Trello' : 'Sandbox'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Post-Dispatch Results & Webhook Inspector ──────────────────────────── */}
      {lastExportResult && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(14, 20, 34, 0.85) 100%)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#34d399" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Successfully Dispatched {lastExportResult.exported_count} Tasks to {lastExportResult.target}
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lastExportResult._dispatchedVia || 'Direct API Synchronizer'} • Status: <strong>200 OK</strong>
                </div>
              </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setActiveInspectorTab('deliverables')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeInspectorTab === 'deliverables' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: activeInspectorTab === 'deliverables' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Deliverables ({lastExportResult.details?.length || 0})
              </button>

              <button
                onClick={() => setActiveInspectorTab('payload')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeInspectorTab === 'payload' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: activeInspectorTab === 'payload' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Code size={13} />
                <span>JSON Payload</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Deliverables List */}
          {activeInspectorTab === 'deliverables' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lastExportResult.details?.map((detail: any, idx: number) => {
                const linkInfo = formatExternalLink(detail.external_url);
                const isDup = detail.status === 'already_published';

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={16} color={isDup ? '#818cf8' : '#34d399'} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                          {detail.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>Target: <strong>{detail.repo || githubRepo}</strong></span>
                          {isDup && <span style={{ color: '#818cf8' }}>• Duplicate creation prevented</span>}
                          {detail.api_mode && <span>• {detail.api_mode}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {detail.external_url && (
                        <button
                          onClick={() => copyToClipboard(detail.external_url, `copy-${idx}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                          title="Copy external URL"
                        >
                          {copiedKey === `copy-${idx}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                          <span>{copiedKey === `copy-${idx}` ? 'Copied' : 'Copy URL'}</span>
                        </button>
                      )}

                      {linkInfo && (
                        <a
                          href={detail.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{
                            fontSize: '0.78rem',
                            padding: '6px 14px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: linkInfo.isLive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                          }}
                        >
                          <span>{linkInfo.badgeText}</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Dispatched Webhook JSON Payload */}
          {activeInspectorTab === 'payload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  RAW DISPATCH PAYLOAD DISPATCHED TO REST APIS
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(lastExportResult.details, null, 2), 'payload-json')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  {copiedKey === 'payload-json' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  <span>{copiedKey === 'payload-json' ? 'Copied Payload' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(6, 8, 13, 0.95)',
                  border: '1px solid var(--border-subtle)',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  maxHeight: '320px',
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(lastExportResult.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
