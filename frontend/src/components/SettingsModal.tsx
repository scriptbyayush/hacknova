import React, { useState } from 'react';
import { X, Save, Key, GitBranch, LayoutGrid, Server, Sparkles } from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 700);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 7, 12, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>System & API Configuration</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* AI LLM Engine Section */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>AI LLM Provider</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Inference Mode
                </label>
                <select
                  className="select"
                  value={formData.llmProvider}
                  onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value as any })}
                >
                  <option value="local">Built-in High-Accuracy Semantic Engine (No API Key Required)</option>
                  <option value="gemini">Google Gemini 1.5 Pro / Flash (Cloud API)</option>
                  <option value="openai">OpenAI GPT-4o / GPT-4o-mini (Cloud API)</option>
                </select>
              </div>

              {formData.llmProvider === 'gemini' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="AIzaSy..."
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                  />
                </div>
              )}

              {formData.llmProvider === 'openai' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="sk-..."
                    value={formData.openaiApiKey}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* GitHub Integration Section */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitBranch size={16} color="#ffffff" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>GitHub Integration</span>
              </div>
              <span className="badge badge-question" style={{ fontSize: '0.65rem' }}>REST API v3</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Target Repository (owner/repo)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. octocat/Hello-World"
                  value={formData.githubRepo}
                  onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="ghp_... or github_pat_..."
                  value={formData.githubToken}
                  onChange={(e) => setFormData({ ...formData, githubToken: e.target.value })}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Used to create live issues with assignees and labels. If left blank, Sandbox simulator creates high-fidelity issue links without credentials.
            </p>
          </div>

          {/* Trello Integration Section */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <LayoutGrid size={16} color="#06b6d4" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>Trello Integration</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Trello API Key
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Optional for Sandbox"
                  value={formData.trelloKey}
                  onChange={(e) => setFormData({ ...formData, trelloKey: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Trello Token
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Optional for Sandbox"
                  value={formData.trelloToken}
                  onChange={(e) => setFormData({ ...formData, trelloToken: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Backend API URL */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Server size={16} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>FastAPI Backend Endpoint</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Service Host URL
              </label>
              <input
                type="text"
                className="input"
                value={formData.backendUrl}
                onChange={(e) => setFormData({ ...formData, backendUrl: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>{savedToast ? 'Saved!' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
