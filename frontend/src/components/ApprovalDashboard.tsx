import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, 
  Edit3, ShieldCheck, Sparkles, User, Calendar, 
  Clock, Tag, Check, Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TaskItem, ClassificationType, TaskPriority, MeetingAnalysisResponse } from '../types';

interface ApprovalDashboardProps {
  analysisData: MeetingAnalysisResponse | null;
  onUpdateTasks: (tasks: TaskItem[]) => void;
  onProceedToExecution: () => void;
}

export const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({
  analysisData,
  onUpdateTasks,
  onProceedToExecution
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [showTranscriptQuote] = useState(true);

  if (!analysisData || analysisData.tasks.length === 0) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', textAlign: 'center', padding: '60px 20px' }} className="glass-panel">
        <Sparkles size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>No Meeting Analyzed Yet</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Please head over to the Meeting Studio to upload notes or load a benchmark sample.
        </p>
      </div>
    );
  }

  const tasks = analysisData.tasks;

  const handleApprove = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, approval_status: 'approved' as const, status: 'todo' as const };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  const handleReject = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, approval_status: 'rejected' as const };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  const handlePromoteSuggestion = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          classification: 'confirmed' as const,
          approval_status: 'approved' as const,
          status: 'todo' as const,
          deadline: t.deadline === 'Pending Approval' || !t.deadline ? 'Friday' : t.deadline
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  const handleBatchApproveConfirmed = () => {
    const updated = tasks.map(t => {
      if (t.classification === 'confirmed') {
        return { ...t, approval_status: 'approved' as const, status: 'todo' as const };
      }
      return t;
    });
    onUpdateTasks(updated);

    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const updated = tasks.map(t => (t.id === editingTask.id ? editingTask : t));
    onUpdateTasks(updated);
    setEditingTask(null);
  };

  const handleResolveConflict = (taskId: string, fixType: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        if (fixType === 'assign_ayush') {
          return { ...t, assignee: 'Ayush', conflicts: t.conflicts.filter(c => c.conflict_type !== 'missing_owner') };
        }
        if (fixType === 'set_deadline_friday') {
          return { ...t, deadline: 'Friday', conflicts: t.conflicts.filter(c => c.conflict_type !== 'ambiguous_deadline') };
        }
        if (fixType === 'dismiss_duplicate') {
          return { ...t, conflicts: t.conflicts.filter(c => c.conflict_type !== 'duplicate') };
        }
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'confirmed' && task.classification === 'confirmed') ||
      (filterType === 'suggestion' && task.classification === 'suggestion') ||
      (filterType === 'question' && task.classification === 'question') ||
      (filterType === 'conflicts' && task.conflicts.length > 0) ||
      (filterType === 'approved' && task.approval_status === 'approved') ||
      (filterType === 'pending' && task.approval_status === 'pending');

    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.deadline && task.deadline.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const totalConflicts = tasks.reduce((sum, t) => sum + t.conflicts.length, 0);
  const pendingApprovals = tasks.filter(t => t.approval_status === 'pending').length;
  const approvedCount = tasks.filter(t => t.approval_status === 'approved').length;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-confirmed">Processing Pipeline • Step 3, 4 & 5</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Human-in-the-Loop Triage Gate</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Review, Classification & Approval Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', marginTop: '4px' }}>
            Verify AI-extracted tasks before they are assigned or dispatched to external systems. Confirmed commitments can be approved immediately; suggestions require explicit human promotion.
          </p>
        </div>

        {/* Global Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleBatchApproveConfirmed}
            className="btn btn-success"
            title="Approve all verified commitments in 1-click"
          >
            <CheckCircle2 size={16} />
            <span>Approve All Confirmed</span>
          </button>

          <button
            onClick={onProceedToExecution}
            disabled={approvedCount === 0}
            className="btn btn-primary"
            title="Proceed to GitHub & Trello export"
          >
            <span>Dispatch to Boards ({approvedCount})</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* Critical Conflict Banner (if any conflicts exist) */}
      {totalConflicts > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} color="#f87171" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f87171' }}>
                {totalConflicts} Potential Conflict{totalConflicts > 1 ? 's' : ''} Detected
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Ambiguous deadlines, unassigned roles, or duplicate tasks require resolution prior to issue creation.
              </div>
            </div>
          </div>

          <button
            onClick={() => setFilterType('conflicts')}
            className="btn btn-danger btn-sm"
          >
            <span>Filter Conflicts</span>
          </button>
        </div>
      )}

      {/* Meeting Summary & Key Decisions Bar */}
      <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Meeting Context & Decisions</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Attendees: {analysisData.detected_attendees.join(', ') || 'Ayush, Rahul'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-confirmed)', display: 'block', marginBottom: '4px' }}>
              ✓ Key Agreed Commitments
            </span>
            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {analysisData.summary.key_decisions.map((dec, i) => (
                <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-confirmed)' }} />
                  {dec}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-suggestion)', display: 'block', marginBottom: '4px' }}>
              💡 Suggestions & Discussion Points
            </span>
            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {analysisData.summary.discussion_points.map((pt, i) => (
                <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-suggestion)' }} />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Tasks (${tasks.length})` },
            { id: 'confirmed', label: `Confirmed (${tasks.filter(t => t.classification === 'confirmed').length})` },
            { id: 'suggestion', label: `Suggestions (${tasks.filter(t => t.classification === 'suggestion').length})` },
            { id: 'conflicts', label: `Conflicts (${totalConflicts})` },
            { id: 'pending', label: `Pending (${pendingApprovals})` },
            { id: 'approved', label: `Approved (${approvedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: filterType === tab.id ? 'var(--accent-primary)' : 'rgba(18, 24, 40, 0.7)',
                borderColor: filterType === tab.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: filterType === tab.id ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '32px', fontSize: '0.8rem', padding: '7px 10px 7px 32px' }}
            placeholder="Search by title, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Task Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredTasks.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tasks match your selected filter.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft: `4px solid ${
                  task.classification === 'confirmed' 
                    ? 'var(--color-confirmed)' 
                    : task.classification === 'suggestion' 
                    ? 'var(--color-suggestion)' 
                    : 'var(--color-question)'
                }`
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    
                    {/* Classification Badge */}
                    {task.classification === 'confirmed' && (
                      <span className="badge badge-confirmed">Confirmed Commitment</span>
                    )}
                    {task.classification === 'suggestion' && (
                      <span className="badge badge-suggestion">Suggestion • Pending Approval</span>
                    )}
                    {task.classification === 'question' && (
                      <span className="badge badge-question">Decision Needed</span>
                    )}

                    {/* Priority Badge */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      background: task.priority === 'urgent' || task.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: task.priority === 'urgent' || task.priority === 'high' ? '#f87171' : 'var(--text-secondary)'
                    }}>
                      {task.priority}
                    </span>

                    {/* Approval State Tag */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: task.approval_status === 'approved' 
                        ? 'rgba(16, 185, 129, 0.2)' 
                        : task.approval_status === 'rejected'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                      color: task.approval_status === 'approved' ? '#34d399' : task.approval_status === 'rejected' ? '#f87171' : '#fbbf24'
                    }}>
                      Status: {task.approval_status.toUpperCase()}
                    </span>

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Confidence: {Math.round(task.confidence * 100)}%
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                    {task.title}
                  </h3>
                </div>

                {/* Action Buttons for Task */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  
                  {/* If it's a suggestion, offer "Promote to Confirmed Task" */}
                  {task.classification === 'suggestion' && task.approval_status !== 'approved' && (
                    <button
                      onClick={() => handlePromoteSuggestion(task.id)}
                      className="btn btn-sm btn-primary"
                      title="Promote undecided idea to official task"
                    >
                      <Sparkles size={14} />
                      <span>Promote to Task</span>
                    </button>
                  )}

                  {/* Standard Approve */}
                  {task.approval_status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(task.id)}
                      className="btn btn-sm btn-success"
                      title="Approve this task"
                    >
                      <Check size={14} />
                      <span>Approve</span>
                    </button>
                  )}

                  {/* Reject */}
                  {task.approval_status !== 'rejected' && (
                    <button
                      onClick={() => handleReject(task.id)}
                      className="btn btn-sm btn-danger"
                      title="Reject or decline this task"
                    >
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => setEditingTask(task)}
                    className="btn btn-sm btn-secondary"
                    title="Edit task details"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Source Quote from Transcript */}
              {task.source_quote && showTranscriptQuote && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: '2px solid var(--accent-primary)',
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                  color: 'var(--text-secondary)'
                }}>
                  "{task.source_quote}"
                </div>
              )}

              {/* Metadata row: Assignee, Deadline, Estimated Hours, Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="var(--accent-primary)" />
                  <span>Assignee: <strong style={{ color: '#ffffff' }}>{task.assignee}</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="var(--accent-primary)" />
                  <span>Deadline: <strong style={{ color: task.deadline === 'Pending Approval' ? '#fbbf24' : '#ffffff' }}>{task.deadline || 'Not set'}</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="var(--accent-primary)" />
                  <span>Est: {task.estimated_hours}h</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} color="var(--accent-primary)" />
                  <span>Tags: {task.tags.join(', ')}</span>
                </div>
              </div>

              {/* Conflicts & Ambiguity Alerts on this task */}
              {task.conflicts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {task.conflicts.map((conf) => (
                    <div
                      key={conf.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: conf.severity === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                        border: `1px solid ${conf.severity === 'critical' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={15} color={conf.severity === 'critical' ? '#f87171' : '#fbbf24'} />
                        <span style={{ fontSize: '0.8rem', color: conf.severity === 'critical' ? '#fca5a5' : '#fde68a' }}>
                          <strong>{conf.conflict_type.replace('_', ' ').toUpperCase()}:</strong> {conf.message}
                        </span>
                      </div>

                      {/* Quick Fix Buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {conf.conflict_type === 'missing_owner' && (
                          <button
                            onClick={() => handleResolveConflict(task.id, 'assign_ayush')}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                          >
                            Assign to Ayush
                          </button>
                        )}
                        {conf.conflict_type === 'ambiguous_deadline' && (
                          <button
                            onClick={() => handleResolveConflict(task.id, 'set_deadline_friday')}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                          >
                            Set to Friday
                          </button>
                        )}
                        {conf.conflict_type === 'duplicate' && (
                          <button
                            onClick={() => handleResolveConflict(task.id, 'dismiss_duplicate')}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                          >
                            Keep Separate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Edit Modal Dialog */}
      {editingTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Edit Task Details</h3>
              <button onClick={() => setEditingTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Assignee
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editingTask.assignee}
                    onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Deadline
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editingTask.deadline || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Classification
                  </label>
                  <select
                    className="select"
                    value={editingTask.classification}
                    onChange={(e) => setEditingTask({ ...editingTask, classification: e.target.value as ClassificationType })}
                  >
                    <option value="confirmed">Confirmed Commitment</option>
                    <option value="suggestion">Suggestion / Exploratory</option>
                    <option value="question">Question / Decision Needed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    className="select"
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingTask(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
