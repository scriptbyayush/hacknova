import React, { useState, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Presentation, 
  Sparkles, ArrowRight, Bot 
} from 'lucide-react';

interface SlideDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab: (tab: string) => void;
}

export const SlideDeckModal: React.FC<SlideDeckModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'MeetFlow AI',
      subtitle: 'Meeting-to-Execution Automation Agent',
      slideNumber: 'Slide 1 — Title & Team Information',
      content: (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(99, 102, 241, 0.5)'
          }}>
            <Bot size={44} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(to right, #ffffff, #818cf8, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MeetFlow AI
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', fontWeight: 500 }}>
            <strong>Tagline:</strong> Turn Every Meeting into Action.
          </p>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px 28px', borderRadius: '12px', border: '1px solid var(--border-subtle)', maxWidth: '580px', fontSize: '0.95rem', color: '#cbd5e1' }}>
            An AI-powered automation platform that transforms raw meeting transcripts into structured, human-approved, and trackable execution workflows for GitHub & Trello.
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span><strong>Hackathon:</strong> HACKNOVA’26</span>
            <span>•</span>
            <span><strong>Domain:</strong> Agentic AI & Automation</span>
          </div>
        </div>
      )
    },
    {
      title: 'The Gap Between Discussion and Execution',
      subtitle: 'Problem Statement & Existing Challenges',
      slideNumber: 'Slide 2 — Problem Statement & Existing Challenges',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '16px 20px', borderRadius: '12px' }}>
            <h4 style={{ color: '#f87171', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>The Problem</h4>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
              Meetings generate decisions, commitments, and follow-up actions, but these outcomes often get lost in lengthy transcripts, scattered notes, and chat messages.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {[
              { title: 'Missed Commitments', desc: 'Critical action items get forgotten without structured capture.' },
              { title: 'Unclear Ownership', desc: 'Tasks lack single directly responsible individuals (DRI).' },
              { title: 'Missing Deadlines', desc: 'Deliverables stall due to absent or vague timelines.' },
              { title: 'Ambiguous Decisions', desc: 'Brainstormed suggestions are mistaken for finalized tasks.' },
              { title: 'Manual Effort', desc: 'PMs waste 30-45 minutes per meeting copying items into trackers.' },
              { title: 'Duplicate Work', desc: 'Overlapping assignments create team friction and confusion.' }
            ].map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>• {item.title}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'MeetFlow AI — From Conversation to Completion',
      subtitle: 'Proposed Solution & Key Innovations',
      slideNumber: 'Slide 3 — Proposed Solution',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ fontSize: '1.05rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            An intelligent meeting assistant that automatically extracts actionable information from transcripts and converts it into tasks through a <strong>human-approved workflow</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {[
              { icon: '🤖', title: 'AI Task Extraction', desc: 'Identifies decisions, action items, owners, deadlines, and follow-ups.' },
              { icon: '⚖️', title: 'Commitment Classification', desc: 'Separates confirmed commitments, suggestions, and unresolved questions.' },
              { icon: '🔍', title: 'Smart Conflict Detection', desc: 'Flags duplicate tasks, missing owners, and clashing deadlines.' },
              { icon: '🛡️', title: 'Human-in-the-Loop Approval', desc: 'Allows users to review, edit, approve, or reject tasks before execution.' },
              { icon: '⚡', title: 'Automated Task Creation', desc: 'Transfers approved tasks directly to GitHub Issues or Trello Cards.' },
              { icon: '📊', title: 'Progress Tracking', desc: 'Highlights overdue, pending, and unassigned deliverables.' }
            ].map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '6px' }}>{item.icon}</span>
                <strong style={{ color: '#ffffff', fontSize: '0.92rem', display: 'block', marginBottom: '4px' }}>{item.title}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))', padding: '14px 20px', borderRadius: '10px', border: '1px solid var(--accent-primary)', textAlign: 'center' }}>
            <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
              Our Differentiator: We don't just summarize meetings. We turn meeting outcomes into approved execution workflows.
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'How MeetFlow AI Works',
      subtitle: 'Technical Approach & 8-Step System Pipeline',
      slideNumber: 'Slide 4 — Technical Approach & System Workflow',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {[
              { step: '1', name: 'Meeting Input', detail: 'Upload transcript (.txt, .vtt) or dictate speech live.' },
              { step: '2', name: 'Text Processing', detail: 'Cleans, tokenizes and preserves conversational speaker cues.' },
              { step: '3', name: 'AI Extraction', detail: 'LLM extracts tasks, owners, and explicit/implicit deadlines.' },
              { step: '4', name: 'Classification', detail: 'Classifies Confirmed vs Suggestion vs Unresolved Question.' },
              { step: '5', name: 'Conflict Checks', detail: 'Runs semantic similarity for duplicates & missing fields.' },
              { step: '6', name: 'Human Approval', detail: 'User reviews, resolves ambiguities, approves or rejects.' },
              { step: '7', name: 'Task Execution', detail: 'Dispatches approved tasks to GitHub Issues or Trello Cards.' },
              { step: '8', name: 'Monitoring', detail: 'Tracks lifecycle, deadlines, and team workload.' }
            ].map((s) => (
              <div key={s.step} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Step {s.step}</span>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', margin: '2px 0 4px' }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            Meeting Transcript ➔ LLM Extraction ➔ Classification ➔ Conflict Engine ➔ Human Approval ➔ GitHub / Trello ➔ Tracking
          </div>
        </div>
      )
    },
    {
      title: 'System Architecture',
      subtitle: '5 Robust Integrated Layers',
      slideNumber: 'Slide 5 — System Architecture',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { layer: '1. Frontend Layer (React / Vite)', detail: 'Transcript upload & speech recording, extracted task cards, human approval gate, and Kanban tracker.' },
            { layer: '2. Backend Layer (Python / FastAPI)', detail: 'REST API, payload orchestration, business logic, Pydantic validation, and data serialization.' },
            { layer: '3. AI & Intelligence Layer', detail: 'Dual-engine: Cloud LLM (Gemini/OpenAI) + Deterministic Semantic NLP extractor with keyword heuristics & Jaccard token matching.' },
            { layer: '4. Data & State Layer', detail: 'Meeting storage, task schemas, approval audit trail, and execution history.' },
            { layer: '5. Integration Layer (GitHub & Trello)', detail: 'GitHub REST API for issue creation/labels and Trello REST API for cards with sandbox simulation mode.' }
          ].map((l, idx) => (
            <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.9rem' }}>{l.layer}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{l.detail}</p>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Technology Stack & Implementation',
      subtitle: 'Full-Stack Hackathon Architecture',
      slideNumber: 'Slide 6 — Technology Stack & Implementation',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[
            { tech: 'React / Next.js / Vite', role: 'Frontend Layer', desc: 'Responsive dashboard, glassmorphism, voice input, Kanban board, and approval triage.' },
            { tech: 'Python / FastAPI', role: 'Backend API', desc: 'High-performance asynchronous REST endpoints, validation, and pipeline orchestration.' },
            { tech: 'LLM API & Semantic NLP', role: 'AI Layer', desc: 'Dual architecture with Gemini/OpenAI cloud models and local deterministic NLP.' },
            { tech: 'PostgreSQL / In-Memory Store', role: 'Database Layer', desc: 'Stores meetings, tasks, approval logs, and execution status.' },
            { tech: 'GitHub REST & Trello APIs', role: 'Integrations', desc: 'Creates issues and cards with real credentials or interactive sandbox simulation.' }
          ].map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span className="badge badge-question" style={{ fontSize: '0.65rem', marginBottom: '8px' }}>{item.role}</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{item.tech}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Prototype & Key Features',
      subtitle: 'Live Working Demonstration',
      slideNumber: 'Slide 7 — Prototype & Key Features',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {[
              { f: 'Feature 1: Transcript-to-Tasks', d: 'Paste notes, upload transcripts or record live mic speech.' },
              { f: 'Feature 2: Intelligent Classification', d: 'Distinguishes confirmed commitments from undecided suggestions.' },
              { f: 'Feature 3: Review & Approval Gate', d: 'Edit details, resolve missing owners/deadlines, and approve.' },
              { f: 'Feature 4: Project Management Sync', d: 'Dispatches approved tasks into GitHub Issues & Trello Cards.' },
              { f: 'Feature 5: Follow-up Dashboard', d: 'Visual Kanban tracking, overdue alerts, and team workload stats.' }
            ].map((feat, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>{feat.f}</span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{feat.d}</p>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--accent-primary)', padding: '12px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>
              Live Flow: Upload Transcript ➔ Generate Tasks ➔ Review & Approve ➔ Create Tasks ➔ Track Progress
            </span>
            <button
              onClick={() => {
                onClose();
                onJumpToTab('studio');
              }}
              className="btn btn-primary btn-sm"
            >
              <span>Test Live Demo</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )
    },
    {
      title: 'Feasibility, Impact & Benefits',
      subtitle: 'Value Proposition & Hackathon Metrics',
      slideNumber: 'Slide 8 — Feasibility, Impact & Benefits',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '16px', borderRadius: '10px' }}>
            <h4 style={{ color: '#34d399', fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Expected Benefits</h4>
            <ul style={{ listStyleType: 'disc', paddingLeft: '18px', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Less manual work:</strong> Saves 30-45 minutes per meeting in task management.</li>
              <li><strong>Better accountability:</strong> Explicit owners and deadlines for every agreed item.</li>
              <li><strong>Decision clarity:</strong> Prevents unapproved ideas from slipping into sprints.</li>
              <li><strong>Immediate execution:</strong> Seamless pipeline to developer backlogs.</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '16px', borderRadius: '10px' }}>
            <h4 style={{ color: '#f87171', fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Risks & Mitigations</h4>
            <ul style={{ listStyleType: 'disc', paddingLeft: '18px', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>AI hallucination:</strong> Human approval gate guarantees zero unvetted task creation.</li>
              <li><strong>Ambiguous assignments:</strong> Automated conflict detector prompts for single owner.</li>
              <li><strong>Duplicate tasks:</strong> Token similarity checks flag duplicate items with merge action.</li>
              <li><strong>API rate limits:</strong> Dual cloud and local NLP fallback ensures 100% uptime.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'From Meeting Conversation to Structured Execution',
      subtitle: 'Slide 9 Benchmark Example',
      slideNumber: 'Slide 9 — Sample Output Benchmark',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '14px', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)', fontSize: '0.85rem', color: '#e2e8f0', fontStyle: 'italic' }}>
            “Let's finish the login page by Friday. Rahul can investigate Google login, but we haven't decided whether to include it. Ayush will update the API documentation by Monday.”
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>Owner</th>
                <th style={{ padding: '8px' }}>Deadline</th>
                <th style={{ padding: '8px' }}>Classification</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 600, color: '#ffffff' }}>Complete the login page</td>
                <td style={{ padding: '10px 8px', color: '#38bdf8' }}>Ayush</td>
                <td style={{ padding: '10px 8px' }}>Friday</td>
                <td style={{ padding: '10px 8px' }}><span className="badge badge-confirmed">Confirmed Commitment</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 600, color: '#ffffff' }}>Investigate Google login</td>
                <td style={{ padding: '10px 8px', color: '#fbbf24' }}>Rahul</td>
                <td style={{ padding: '10px 8px' }}>Not specified</td>
                <td style={{ padding: '10px 8px' }}><span className="badge badge-suggestion">Suggested / Exploratory Action</span></td>
              </tr>
              <tr>
                <td style={{ padding: '10px 8px', fontWeight: 600, color: '#ffffff' }}>Update API documentation</td>
                <td style={{ padding: '10px 8px', color: '#38bdf8' }}>Ayush</td>
                <td style={{ padding: '10px 8px' }}>Monday</td>
                <td style={{ padding: '10px 8px' }}><span className="badge badge-confirmed">Confirmed Commitment</span></td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
            <strong>Key Distinction:</strong> Investigating a suggestion does not mean the feature itself is approved. MeetFlow AI prevents premature code implementation.
          </div>
        </div>
      )
    },
    {
      title: 'THANK YOU!',
      subtitle: 'MeetFlow AI — Turn Every Meeting into Action',
      slideNumber: 'Slide 10 — Conclusion & Q&A',
      content: (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
          }}>
            <Sparkles size={36} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff' }}>
            Questions & Discussion
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '540px' }}>
            From discussions to decisions.<br />
            From decisions to approved tasks.<br />
            From approved tasks to execution.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              onClick={() => {
                onClose();
                onJumpToTab('approval');
              }}
              className="btn btn-primary"
            >
              <span>Explore Live Prototype</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )
    }
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlide(prev => (prev < slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length]);

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 7, 12, 0.92)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      color: '#ffffff'
    }}>
      {/* Deck Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 14, 24, 0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Presentation size={20} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>HACKNOVA’26 Final Pitch Deck</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {slide.slideNumber}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Slide Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        overflowY: 'auto'
      }}>
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '920px',
          minHeight: '480px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          {currentSlide !== 0 && currentSlide !== 9 && (
            <div style={{ marginBottom: '24px' }}>
              <span className="badge badge-question" style={{ marginBottom: '8px' }}>{slide.slideNumber}</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {slide.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                {slide.subtitle}
              </p>
            </div>
          )}

          {slide.content}
        </div>
      </div>

      {/* Deck Footer Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 14, 24, 0.6)'
      }}>
        <button
          onClick={() => setCurrentSlide(prev => (prev > 0 ? prev - 1 : prev))}
          disabled={currentSlide === 0}
          className="btn btn-secondary btn-sm"
        >
          <ChevronLeft size={16} />
          <span>Previous Slide</span>
        </button>

        {/* Thumbnail Dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: i === currentSlide ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: i === currentSlide ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(prev => (prev < slides.length - 1 ? prev + 1 : prev))}
          disabled={currentSlide === slides.length - 1}
          className="btn btn-primary btn-sm"
        >
          <span>Next Slide</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
