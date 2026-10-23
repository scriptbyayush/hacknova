import React, { useState, useEffect } from 'react';
import {
  Send, GitBranch, LayoutGrid, CheckCircle2, ExternalLink,
  FileJson, FileSpreadsheet, Key, RefreshCw, Check, Copy,
  ChevronDown, ChevronUp, Sparkles, Eye, EyeOff, AlertTriangle,
  Shield, Terminal, Zap, Clock, Info, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TaskItem, AppSettings, MeetingAnalysisResponse } from '../types';
import { exportTasksAPI, verifyGitHubRepo } from '../api';

interface ExecutionHubProps {
  analysisData: MeetingAnalysisResponse | null;
  settings: AppSettings;
  onUpdateTasks: (tasks: TaskItem[]) => void;
  focusGitHub?: boolean;
}

export const ExecutionHub: React.FC<ExecutionHubProps> = ({
  analysisData,
  settings,
  onUpdateTasks,
  focusGitHub,
}) => {
  const [targetPlatform, setTargetPlatform] = useState<'github' | 'trello' | 'sandbox'>(
    focusGitHub ? 'github' : 'github'
  );
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<any | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // GitHub config
  const [githubRepo, setGithubRepo] = useState(settings.githubRepo || 'scriptbyayush/hacknova');
  const [githubToken, setGithubToken] = useState(settings.githubToken || '');
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [repoStatus, setRepoStatus] = useState<{ success: boolean; message: string; status?: string } | null>(null);
  const [showGitHubConfig, setShowGitHubConfig] = useState(focusGitHub ?? true);

  const tasks = analysisData?.tasks || [];
  const approvedTasks = tasks.filter(t => t.approval_status === 'approved');
  const pendingTasks = tasks.filter(t => t.approval_status === 'pending');

  useEffect(() => {
    if (approvedTasks.length > 0 && selectedTaskIds.length === 0) {
      setSelectedTaskIds(approvedTasks.map(t => t.id));
    }
  }, [analysisData]);

  useEffect(() => {
    if (settings.githubToken) setGithubToken(settings.githubToken);
    if (settings.githubRepo) setGithubRepo(settings.githubRepo);
  }, [settings]);

  const toggleTask = (id: string) => {
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === approvedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(approvedTasks.map(t => t.id));
    }
  };

  const handleVerifyRepo = async () => {
    if (!githubRepo.trim()) {
      setRepoStatus({ success: false, message: 'Enter a repository in owner/repo format.' });
      return;
    }
    setIsVerifying(true);
    setRepoStatus(null);
    const res = await verifyGitHubRepo(githubRepo, githubToken);
    setIsVerifying(false);
    setRepoStatus({ success: res.success, message: res.message, status: (res as any).status });
  };

  const handleDispatch = async (idsOverride?: string[]) => {
    const idsToDispatch = idsOverride || selectedTaskIds;
    if (idsToDispatch.length === 0) return;

    setIsExporting(true);
    setLastExportResult(null);
    try {
      const activeSettings: AppSettings = {
        ...settings,
        githubRepo: githubRepo.trim() || settings.githubRepo,
        githubToken: githubToken.trim() || settings.githubToken,
      };

      // Try backend first for real GitHub publish
      let result: any = null;
      if (settings.backendUrl && settings.backendUrl !== 'none' && targetPlatform === 'github' && activeSettings.githubToken) {
        try {
          const [owner, repo] = (activeSettings.githubRepo || '').split('/', 2);
          if (owner && repo) {
            const res = await fetch(`${settings.backendUrl}/api/github/publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_ids: idsToDispatch,
                owner,
                repo,
                token: activeSettings.githubToken,
              }),
              signal: AbortSignal.timeout(15000),
            });
            if (res.ok) {
              result = await res.json();
              result._via_backend = true;
            }
          }
        } catch {}
      }

      // Fallback: client-side dispatch
      if (!result) {
        result = await exportTasksAPI(idsToDispatch, targetPlatform, activeSettings, tasks);
      }

      setLastExportResult(result);

      // Update tasks with returned URLs
      const updated = tasks.map(t => {
        const match = result.details?.find((d: any) => d.task_id === t.id);
        if (match && match.external_url) {
          return targetPlatform === 'trello'
            ? { ...t, trello_card_url: match.external_url }
            : { ...t, github_issue_url: match.external_url };
        }
        return t;
      });
      onUpdateTasks(updated);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#22d3ee', '#f59e0b', '#a78bfa'],
      });
    } catch (err) {
      console.error('Dispatch error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickDispatch = async () => {
    const target = approvedTasks[0] || tasks[0];
    if (!target) return;

    if (target.approval_status !== 'approved') {
      const updated = tasks.map(t =>
        t.id === target.id ? { ...t, approval_status: 'approved' as const, status: 'todo' as const } : t
      );
      onUpdateTasks(updated);
    }
    await handleDispatch([target.id]);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(key);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `meetflow-tasks-${Date.now()}.json`; a.click();
  };

  const downloadCSV = () => {
    const rows = ['ID,Title,Assignee,Deadline,Classification,Priority,Status,GitHub URL', ...tasks.map(t =>
      `"${t.id}","${t.title}","${t.assignee}","${t.deadline || ''}","${t.classification}","${t.priority}","${t.status}","${t.github_issue_url || ''}"`
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `meetflow-tasks-${Date.now()}.csv`; a.click();
  };

  const getStatusConfig = (status: string) => {
    if (status === 'success') return { color: 'var(--green)', icon: <CheckCircle2 size={14} />, label: 'Published' };
    if (status === 'already_published') return { color: 'var(--blue)', icon: <Shield size={14} />, label: 'Duplicate Prevented' };
    if (['auth_failed', 'forbidden', 'not_found', 'validation_error', 'failed'].includes(status))
      return { color: 'var(--red)', icon: <AlertTriangle size={14} />, label: 'Failed' };
    if (status?.includes('sandbox')) return { color: 'var(--amber)', icon: <Terminal size={14} />, label: 'Sandbox' };
    return { color: 'var(--text-3)', icon: <Clock size={14} />, label: status };
  };

  // Empty state
  if (!analysisData || tasks.length === 0) {
    return (
      <div className="page">
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div className="empty-state">
            <div className="empty-state-icon">
              <Send size={24} color="var(--indigo-light)" />
            </div>
            <div className="empty-state-title">No Tasks to Dispatch</div>
            <div className="empty-state-desc">
              Analyze a meeting in Meeting Studio and approve tasks in the Review Center first.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const successCount = lastExportResult?.details?.filter((d: any) => d.status === 'success').length || 0;
  const dupCount = lastExportResult?.details?.filter((d: any) => d.status === 'already_published').length || 0;
  const failCount = lastExportResult?.details?.filter((d: any) =>
    !['success','already_published'].includes(d.status) && !d.status?.includes('sandbox')
  ).length || 0;
  const sandboxCount = lastExportResult?.details?.filter((d: any) => d.status?.includes('sandbox')).length || 0;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-indigo" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="pulse-dot pulse-dot-indigo" style={{ width: '6px', height: '6px' }} />
              Execution Hub — Step 7 & 8
            </span>
          </div>
          <h1 className="page-title">Execution & GitHub Dispatch</h1>
          <p className="page-subtitle">
            Publish approved meeting tasks as real GitHub Issues. Duplicate creation is prevented automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={downloadCSV} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={13} /> Export CSV
          </button>
          <button onClick={downloadJSON} className="btn btn-secondary btn-sm">
            <FileJson size={13} /> Export JSON
          </button>
          <button
            onClick={handleQuickDispatch}
            disabled={isExporting || tasks.length === 0}
            className={`btn btn-github btn-sm ${isExporting ? 'btn-loading' : ''}`}
          >
            <Sparkles size={13} />
            Quick Dispatch
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left: Platform + Task Selector + Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Platform Selector */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Target Platform
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { id: 'github', label: 'GitHub Issues', icon: <GitBranch size={16} />, color: 'var(--text-2)', selectedBg: 'rgba(99,102,241,0.12)', selectedBorder: 'rgba(99,102,241,0.4)' },
                { id: 'trello', label: 'Trello Board', icon: <LayoutGrid size={16} />, color: 'var(--cyan)', selectedBg: 'rgba(34,211,238,0.08)', selectedBorder: 'rgba(34,211,238,0.3)' },
                { id: 'sandbox', label: 'Sandbox Sim', icon: <Terminal size={16} />, color: 'var(--amber)', selectedBg: 'rgba(245,158,11,0.08)', selectedBorder: 'rgba(245,158,11,0.3)' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setTargetPlatform(p.id as any)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 14px', borderRadius: 'var(--r-lg)',
                    border: `1px solid ${targetPlatform === p.id ? p.selectedBorder : 'var(--border-1)'}`,
                    background: targetPlatform === p.id ? p.selectedBg : 'transparent',
                    color: targetPlatform === p.id ? p.color : 'var(--text-3)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    fontSize: '13px', fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.icon} {p.label}
                  {targetPlatform === p.id && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                  )}
                </button>
              ))}
            </div>

            {targetPlatform === 'sandbox' && (
              <div className="alert alert-warning" style={{ marginTop: '10px', fontSize: '12px' }}>
                <Info size={14} />
                <span>Sandbox mode simulates GitHub issues without real API calls. URLs link to GitHub's new issue form.</span>
              </div>
            )}
          </div>

          {/* Task Selection */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Select Tasks to Dispatch
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                  {selectedTaskIds.length}/{approvedTasks.length} selected
                </span>
                {approvedTasks.length > 0 && (
                  <button className="btn btn-ghost btn-xs" onClick={toggleSelectAll}>
                    {selectedTaskIds.length === approvedTasks.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>

            {approvedTasks.length === 0 && (
              <div className="alert alert-warning" style={{ fontSize: '12px' }}>
                <AlertTriangle size={14} />
                <div>
                  <div style={{ fontWeight: 600 }}>No approved tasks</div>
                  <div style={{ opacity: 0.8 }}>
                    {pendingTasks.length > 0
                      ? `${pendingTasks.length} tasks are pending review. Go to the Review tab to approve them.`
                      : 'Analyze a meeting first.'}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {approvedTasks.map(task => {
                const isSelected = selectedTaskIds.includes(task.id);
                const alreadyPublished = !!task.github_issue_url || !!task.trello_card_url;
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: 'var(--r-lg)',
                      border: `1px solid ${isSelected ? 'var(--border-accent)' : 'var(--border-1)'}`,
                      background: isSelected ? 'var(--bg-active)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <Check size={10} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '2px' }}>
                        {task.assignee} · {task.deadline || 'No deadline'} · {task.priority}
                      </div>
                    </div>
                    {alreadyPublished && (
                      <span className="badge badge-published" style={{ fontSize: '10px' }}>
                        <CheckCircle2 size={9} /> Published
                      </span>
                    )}
                    <span className={`badge badge-${task.classification}`} style={{ fontSize: '10px' }}>
                      {task.classification}
                    </span>
                  </div>
                );
              })}

              {/* Pending tasks (not selectable) */}
              {pendingTasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: 'var(--r-lg)',
                    border: '1px solid var(--border-1)', opacity: 0.45,
                    cursor: 'not-allowed',
                  }}
                >
                  <div className="checkbox" style={{ borderColor: 'var(--border-2)', cursor: 'not-allowed' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </div>
                  </div>
                  <span className="badge badge-pending" style={{ fontSize: '10px' }}>Needs Approval</span>
                </div>
              ))}
            </div>

            {/* Dispatch Button */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-1)' }}>
              <button
                onClick={() => handleDispatch()}
                disabled={isExporting || selectedTaskIds.length === 0}
                className={`btn btn-primary btn-lg ${isExporting ? 'btn-loading' : ''}`}
                style={{ width: '100%' }}
              >
                {!isExporting && <Send size={16} />}
                {isExporting
                  ? `Publishing ${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? 's' : ''}…`
                  : `Publish ${selectedTaskIds.length} Task${selectedTaskIds.length !== 1 ? 's' : ''} to ${
                      targetPlatform === 'github' ? 'GitHub Issues' :
                      targetPlatform === 'trello' ? 'Trello Board' : 'Sandbox'
                    }`
                }
              </button>
              {selectedTaskIds.length === 0 && approvedTasks.length > 0 && (
                <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-4)', marginTop: '6px' }}>
                  Select at least one task above
                </p>
              )}
            </div>
          </div>

          {/* Export Results */}
          {lastExportResult && (
            <div className={`card ${(successCount > 0 || sandboxCount > 0) ? 'card-success-glow' : ''}`} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color={successCount > 0 ? 'var(--green)' : 'var(--amber)'} />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-1)' }}>
                    Dispatch Complete
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {successCount > 0 && <span className="badge badge-confirmed">{successCount} published</span>}
                  {dupCount > 0 && <span className="badge badge-indigo">{dupCount} dup prevented</span>}
                  {failCount > 0 && <span className="badge badge-conflict">{failCount} failed</span>}
                  {sandboxCount > 0 && <span className="badge badge-suggestion">{sandboxCount} sandbox</span>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lastExportResult.details?.map((detail: any, i: number) => {
                  const sc = getStatusConfig(detail.status);
                  const isLiveIssue = detail.status === 'success' && detail.external_url?.includes('/issues/') && !detail.external_url?.includes('/new');
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '12px 14px', borderRadius: 'var(--r-lg)',
                        background: `${sc.color}0d`,
                        border: `1px solid ${sc.color}30`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ color: sc.color }}>{sc.icon}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: sc.color }}>{sc.label}</span>
                            {detail.issue_number && (
                              <span style={{ fontSize: '11px', color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
                                #{detail.issue_number}
                              </span>
                            )}
                            {detail.duplicate_prevented && (
                              <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
                                <Shield size={9} /> Dup Guard
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {detail.title}
                          </div>
                          {detail.error && (
                            <div style={{ fontSize: '11px', color: 'var(--red-2)', marginTop: '4px' }}>{detail.error}</div>
                          )}
                          {detail.message && detail.status === 'already_published' && (
                            <div style={{ fontSize: '11px', color: 'var(--blue-2)', marginTop: '4px' }}>{detail.message}</div>
                          )}
                        </div>
                        {detail.external_url && (
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              className="btn btn-ghost btn-icon btn-xs"
                              onClick={() => copyToClipboard(detail.external_url, `url-${i}`)}
                              title="Copy URL"
                            >
                              {copiedState === `url-${i}` ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
                            </button>
                            <a
                              href={detail.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-icon btn-xs"
                              title={isLiveIssue ? 'Open GitHub Issue' : 'Open on GitHub'}
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payload Inspector Toggle */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPayload(!showPayload)}
                style={{ marginTop: '10px', width: '100%', justifyContent: 'center', gap: '6px' }}
              >
                <Terminal size={12} />
                {showPayload ? 'Hide' : 'Show'} API Payload
                {showPayload ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showPayload && lastExportResult.details?.[0]?.payload_dispatched && (
                <div className="code-block" style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      GitHub REST API Payload
                    </span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => copyToClipboard(JSON.stringify(lastExportResult.details[0].payload_dispatched, null, 2), 'payload')}
                    >
                      {copiedState === 'payload' ? <Check size={11} color="var(--green)" /> : <Copy size={11} />}
                      {copiedState === 'payload' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre>{JSON.stringify(lastExportResult.details[0].payload_dispatched, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: GitHub Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* GitHub Config */}
          <div className="card" style={{ padding: '16px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowGitHubConfig(!showGitHubConfig)}
              style={{ width: '100%', justifyContent: 'space-between', marginBottom: showGitHubConfig ? '12px' : 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitBranch size={14} color="var(--text-3)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  GitHub Configuration
                </span>
              </div>
              {showGitHubConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showGitHubConfig && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Token input */}
                <div className="input-group">
                  <label className="input-label">
                    <Key size={11} style={{ display: 'inline', marginRight: '4px' }} />
                    Personal Access Token
                  </label>
                  <div style={{ display: 'flex', gap: '0' }}>
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={githubToken}
                      onChange={e => setGithubToken(e.target.value)}
                      className="input"
                      placeholder="ghp_xxxxx… or fine-grained PAT"
                      style={{ borderRadius: 'var(--r-md) 0 0 var(--r-md)', borderRight: 'none', fontFamily: githubToken ? 'var(--font-mono)' : 'inherit', fontSize: '12px' }}
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="btn btn-secondary btn-icon"
                      style={{ borderRadius: '0 var(--r-md) var(--r-md) 0', flexShrink: 0 }}
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '2px' }}>
                    Requires: <code style={{ fontFamily: 'var(--font-mono)' }}>repo</code> → Issues read/write scope
                  </div>
                </div>

                {/* Repo input */}
                <div className="input-group">
                  <label className="input-label">Repository</label>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={e => setGithubRepo(e.target.value)}
                    className="input"
                    placeholder="owner/repo-name"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                  />
                </div>

                {/* Verify button */}
                <button
                  onClick={handleVerifyRepo}
                  disabled={isVerifying}
                  className={`btn btn-secondary btn-sm ${isVerifying ? 'btn-loading' : ''}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {!isVerifying && <RefreshCw size={13} />}
                  {isVerifying ? 'Verifying…' : 'Test Connection'}
                </button>

                {/* Repo status */}
                {repoStatus && (
                  <div className={`alert ${repoStatus.success ? 'alert-success' : 'alert-error'}`} style={{ fontSize: '12px' }}>
                    {repoStatus.success ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    <span>{repoStatus.message}</span>
                  </div>
                )}

                {/* Security note */}
                <div className="alert alert-indigo" style={{ fontSize: '11px' }}>
                  <Shield size={12} />
                  <span>Token is only stored locally in your browser and sent to the backend API — never exposed in source code.</span>
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Protection Info */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={14} color="var(--indigo-light)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>Duplicate Protection</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>
              Each task can only create one GitHub Issue per repository. Re-clicking Publish will not create duplicates — the backend registry prevents it.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Task Summary
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Total Tasks', value: tasks.length, color: 'var(--text-2)' },
                { label: 'Approved', value: approvedTasks.length, color: 'var(--green-2)' },
                { label: 'Selected', value: selectedTaskIds.length, color: 'var(--indigo-light)' },
                { label: 'Already Published', value: tasks.filter(t => t.github_issue_url || t.trello_card_url).length, color: 'var(--amber-2)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{row.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Publication History: show recently published tasks */}
          {tasks.filter(t => t.github_issue_url && !t.github_issue_url.includes('/new')).length > 0 && (
            <div className="card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Published Issues
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tasks.filter(t => t.github_issue_url && !t.github_issue_url.includes('/new')).map(t => (
                  <a
                    key={t.id}
                    href={t.github_issue_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: 'var(--r-md)',
                      border: '1px solid var(--border-1)', textDecoration: 'none',
                      transition: 'background 0.15s',
                      color: 'var(--text-1)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <GitBranch size={12} color="var(--green-2)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</span>
                    <ExternalLink size={11} color="var(--text-4)" style={{ flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
