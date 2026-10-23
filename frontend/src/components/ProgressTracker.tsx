import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, 
  User, Calendar, TrendingUp, Check,
  GitBranch, ExternalLink
} from 'lucide-react';
import type { TaskItem, TaskStatus, MeetingAnalysisResponse } from '../types';

interface ProgressTrackerProps {
  analysisData: MeetingAnalysisResponse | null;
  onUpdateTasks: (tasks: TaskItem[]) => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  analysisData,
  onUpdateTasks
}) => {
  const [activeView, setActiveView] = useState<'kanban' | 'list'>('kanban');

  const tasks = analysisData?.tasks || [];

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'backlog', title: '💡 Backlog & Suggestions', color: '#fbbf24' },
    { id: 'todo', title: '📋 To Do', color: '#818cf8' },
    { id: 'in_progress', title: '⚡ In Progress', color: '#38bdf8' },
    { id: 'in_review', title: '🔍 In Review', color: '#c084fc' },
    { id: 'done', title: '✅ Done', color: '#34d399' }
  ];

  const handleMoveStatus = (taskId: string, newStatus: TaskStatus) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, status: newStatus } : t));
    onUpdateTasks(updated);
  };

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const unassignedTasks = tasks.filter(t => !t.assignee || t.assignee.toLowerCase().includes('unassigned')).length;

  // Workload breakdown
  const memberWorkload: { [key: string]: number } = {};
  tasks.forEach(t => {
    const name = t.assignee || 'Unassigned';
    memberWorkload[name] = (memberWorkload[name] || 0) + 1;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-confirmed">Processing Pipeline • Step 8</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Progress & Accountability Oversight</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Meeting Execution & Progress Tracker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', marginTop: '4px' }}>
            Monitor the lifecycle of deliverables from meeting discussions to completion. Highlights overdue deadlines, team workload distribution, and unassigned work.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(18, 24, 40, 0.6)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveView('kanban')}
            className={`btn btn-sm ${activeView === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px', border: 'none' }}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`btn btn-sm ${activeView === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px', border: 'none' }}
          >
            Task Table
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
              {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sprint Completion Rate</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} color="var(--color-confirmed)" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>{completedTasks} / {totalTasks}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks Delivered</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={22} color="var(--color-suggestion)" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>{unassignedTasks}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unassigned Items</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} color="var(--color-question)" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
              {totalTasks * 15}m
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Time Saved</div>
          </div>
        </div>
      </div>

      {/* Team Member Workload Distribution */}
      <div className="glass-panel" style={{ padding: '18px 24px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
          Team Deliverables & Capacity Distribution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {Object.entries(memberWorkload).map(([name, count]) => (
            <div
              key={name}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {name.charAt(0)}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{name}</span>
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8'
              }}>
                {count} {count === 1 ? 'task' : 'tasks'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board View */}
      {activeView === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          alignItems: 'start'
        }}>
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="glass-panel"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'rgba(14, 19, 31, 0.55)',
                  minHeight: '400px'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>{col.title}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {colTasks.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          background: 'rgba(22, 30, 49, 0.9)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: task.classification === 'confirmed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: task.classification === 'confirmed' ? '#34d399' : '#fbbf24',
                            textTransform: 'uppercase'
                          }}>
                            {task.classification}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff', lineHeight: 1.35 }}>
                          {task.title}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} />
                            {task.assignee}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {task.deadline || 'Pending'}
                          </span>
                        </div>

                        {task.github_issue_url && (
                          <div style={{ marginTop: '2px' }}>
                            <a
                              href={task.github_issue_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.7rem',
                                color: '#34d399',
                                textDecoration: 'none',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              <GitBranch size={11} />
                              <span>Direct to GitHub</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}

                        {/* Quick Status Forwarder */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                          {col.id !== 'todo' && col.id !== 'done' && (
                            <button
                              onClick={() => handleMoveStatus(task.id, 'todo')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                              title="Move to To Do"
                            >
                              To Do
                            </button>
                          )}
                          {col.id !== 'in_progress' && col.id !== 'done' && (
                            <button
                              onClick={() => handleMoveStatus(task.id, 'in_progress')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                              title="Move to In Progress"
                            >
                              In Progress
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={() => handleMoveStatus(task.id, 'done')}
                              className="btn btn-success btn-sm"
                              style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                              title="Mark Done"
                            >
                              <Check size={10} />
                              <span>Done</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Table View */}
      {activeView === 'list' && (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px' }}>Task Title</th>
                <th style={{ padding: '10px' }}>Assignee</th>
                <th style={{ padding: '10px' }}>Deadline</th>
                <th style={{ padding: '10px' }}>Classification</th>
                <th style={{ padding: '10px' }}>Priority</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#ffffff' }}>{task.title}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{task.assignee}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{task.deadline || 'Pending'}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className={`badge badge-${task.classification}`}>
                      {task.classification}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', textTransform: 'capitalize' }}>{task.priority}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {task.status !== 'done' ? (
                      <button
                        onClick={() => handleMoveStatus(task.id, 'done')}
                        className="btn btn-success btn-sm"
                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                      >
                        Complete
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-confirmed)', fontSize: '0.75rem', fontWeight: 700 }}>✓ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
