import React, { useState } from 'react';
import { 
  Send, GitBranch, LayoutGrid, CheckCircle2, ExternalLink, 
  FileJson, FileSpreadsheet, ShieldAlert, Terminal 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TaskItem, AppSettings, MeetingAnalysisResponse } from '../types';
import { exportTasksAPI } from '../api';

interface ExecutionHubProps {
  analysisData: MeetingAnalysisResponse | null;
  settings: AppSettings;
  onUpdateTasks: (tasks: TaskItem[]) => void;
}

export const ExecutionHub: React.FC<ExecutionHubProps> = ({
  analysisData,
  settings,
  onUpdateTasks
}) => {
  const [targetPlatform, setTargetPlatform] = useState<'github' | 'trello' | 'sandbox'>('github');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<any | null>(null);

  const tasks = analysisData?.tasks || [];
  const approvedTasks = tasks.filter(t => t.approval_status === 'approved');

  // Auto-select all approved tasks initially
  React.useEffect(() => {
    if (approvedTasks.length > 0 && selectedTaskIds.length === 0) {
      setSelectedTaskIds(approvedTasks.map(t => t.id));
    }
  }, [analysisData]);

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.length === approvedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(approvedTasks.map(t => t.id));
    }
  };

  const handleDispatch = async () => {
    if (selectedTaskIds.length === 0) return;

    setIsExporting(true);
    try {
      const res = await exportTasksAPI(selectedTaskIds, targetPlatform, settings, tasks);
      setLastExportResult(res);

      // Update tasks with issue/card external URLs
      const updated = tasks.map(t => {
        const itemDetail = res.details?.find((d: any) => d.task_id === t.id);
        if (itemDetail) {
          if (targetPlatform === 'github' || targetPlatform === 'sandbox') {
            return { ...t, github_issue_url: itemDetail.external_url };
          } else {
            return { ...t, trello_card_url: itemDetail.external_url };
          }
        }
        return t;
      });
      onUpdateTasks(updated);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `meetflow-tasks-${Date.now()}.json`;
    a.click();
  };

  const downloadCSV = () => {
    const headers = 'ID,Title,Assignee,Deadline,Classification,Priority,Status\n';
    const rows = tasks.map(t => `"${t.id}","${t.title}","${t.assignee}","${t.deadline || ''}","${t.classification}","${t.priority}","${t.status}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meetflow-tasks-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-question">Processing Pipeline • Step 7 & 8</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automated External Task Creation</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Execution & Project Management Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', marginTop: '4px' }}>
            Dispatch approved deliverables directly into GitHub Issues or Trello Cards with assigned owners, labels, and deadlines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={downloadCSV} className="btn btn-secondary btn-sm" title="Export as CSV spreadsheet">
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
          <button onClick={downloadJSON} className="btn btn-secondary btn-sm" title="Export raw JSON schema">
            <FileJson size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Target Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        
        {/* GitHub Option */}
        <div
          onClick={() => setTargetPlatform('github')}
          className="glass-panel"
          style={{
            padding: '20px',
            cursor: 'pointer',
            border: targetPlatform === 'github' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: targetPlatform === 'github' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>GitHub Issues</span>
              {targetPlatform === 'github' && <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>Active</span>}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Creates repository issues with milestones, tags, and assignees.
            </p>
          </div>
        </div>

        {/* Trello Option */}
        <div
          onClick={() => setTargetPlatform('trello')}
          className="glass-panel"
          style={{
            padding: '20px',
            cursor: 'pointer',
            border: targetPlatform === 'trello' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: targetPlatform === 'trello' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutGrid size={24} color="#06b6d4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>Trello Cards</span>
              {targetPlatform === 'trello' && <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>Active</span>}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Populates Kanban cards, due dates, and member assignments.
            </p>
          </div>
        </div>

        {/* Sandbox Simulator */}
        <div
          onClick={() => setTargetPlatform('sandbox')}
          className="glass-panel"
          style={{
            padding: '20px',
            cursor: 'pointer',
            border: targetPlatform === 'sandbox' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: targetPlatform === 'sandbox' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>Sandbox Dispatcher</span>
              {targetPlatform === 'sandbox' && <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>Active</span>}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Zero-credential live simulation with mock webhook inspection.
            </p>
          </div>
        </div>

      </div>

      {/* Task Selection Checklist */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Select Approved Tasks to Dispatch ({selectedTaskIds.length}/{approvedTasks.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Only tasks validated and approved in the Review stage can be transferred.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSelectAll} className="btn btn-secondary btn-sm">
              {selectedTaskIds.length === approvedTasks.length ? 'Deselect All' : 'Select All Approved'}
            </button>

            <button
              onClick={handleDispatch}
              disabled={isExporting || selectedTaskIds.length === 0}
              className="btn btn-primary"
              style={{ padding: '8px 18px' }}
            >
              <Send size={15} />
              <span>{isExporting ? 'Creating Tasks...' : `Dispatch to ${targetPlatform === 'github' ? 'GitHub' : targetPlatform === 'trello' ? 'Trello' : 'Sandbox'}`}</span>
            </button>
          </div>
        </div>

        {approvedTasks.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
            <ShieldAlert size={28} color="#fbbf24" style={{ marginBottom: '8px' }} />
            <p>No approved tasks found yet.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Go to <strong>Review & Approval</strong> to approve confirmed commitments first!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {approvedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleSelectTask(task.id)}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: selectedTaskIds.includes(task.id) ? 'rgba(99, 102, 241, 0.09)' : 'rgba(14, 19, 31, 0.6)',
                  border: `1px solid ${selectedTaskIds.includes(task.id) ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={() => {}}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#ffffff' }}>{task.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '3px' }}>
                      <span>Owner: <strong>{task.assignee}</strong></span>
                      <span>•</span>
                      <span>Due: <strong>{task.deadline || 'Friday'}</strong></span>
                      <span>•</span>
                      <span>Priority: <strong style={{ textTransform: 'capitalize' }}>{task.priority}</strong></span>
                    </div>
                  </div>
                </div>

                {/* External link badge if already exported */}
                {(task.github_issue_url || task.trello_card_url) && (
                  <a
                    href={task.github_issue_url || task.trello_card_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      textDecoration: 'none'
                    }}
                  >
                    <span>Created #{task.github_issue_url ? task.github_issue_url.split('/').pop() : 'Card'}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Dispatch Log / Inspection Payload */}
      {lastExportResult && (
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-confirmed)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                Successfully Dispatched {lastExportResult.exported_count} Tasks to {lastExportResult.target}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: 200 OK</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lastExportResult.details?.map((detail: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--color-confirmed)' }}>✓</span>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>{detail.title}</span>
                </div>
                <a
                  href={detail.external_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <span>{detail.external_url}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
