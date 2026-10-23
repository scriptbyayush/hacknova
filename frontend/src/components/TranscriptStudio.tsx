import React, { useState, useRef } from 'react';
import { 
  Upload, Mic, MicOff, Sparkles, CheckCircle2, 
  Layers, ArrowRight, Volume2, HelpCircle 
} from 'lucide-react';
import { SAMPLE_TRANSCRIPTS } from '../mockData';
import type { AppSettings, MeetingAnalysisResponse } from '../types';
import { analyzeTranscriptAPI } from '../api';

interface TranscriptStudioProps {
  settings: AppSettings;
  onAnalysisComplete: (result: MeetingAnalysisResponse) => void;
  analysisData: MeetingAnalysisResponse | null;
}

export const TranscriptStudio: React.FC<TranscriptStudioProps> = ({
  settings,
  onAnalysisComplete,
  analysisData
}) => {
  const [title, setTitle] = useState('Hacknova Sprint Sync — Auth & API Planning');
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPTS[0].content);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const pipelineSteps = [
    'Cleaning and segmenting conversational context...',
    'Extracting decisions, action items, owners & deadlines with AI...',
    'Classifying commitments vs suggestions & exploratory actions...',
    'Validating duplicates, ambiguous assignments & deadline conflicts...',
    'Finalizing human-in-the-loop review package...'
  ];

  const handleSelectSample = (sample: typeof SAMPLE_TRANSCRIPTS[0]) => {
    setTitle(sample.title);
    setTranscript(sample.content);
    setUploadFeedback(`Loaded template: ${sample.title}`);
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTranscript(content);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      setUploadFeedback(`Successfully imported: ${file.name}`);
      setTimeout(() => setUploadFeedback(null), 3000);
    };
    reader.readAsText(file);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(prev => (prev ? prev + ' ' : '') + currentTranscript);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e);
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } else {
        // Fallback simulated dictation
        setIsRecording(true);
        const simulatedWords = [
          "\nAyush: Let's also ensure the database migrations run before the frontend deploy.",
          "\nRahul: I agree. I can review the SQL scripts on Thursday."
        ];
        let idx = 0;
        const interval = setInterval(() => {
          if (idx < simulatedWords.length) {
            setTranscript(prev => prev + simulatedWords[idx]);
            idx++;
          } else {
            clearInterval(interval);
            setIsRecording(false);
          }
        }, 1800);
      }
    }
  };

  const runAnalysis = async () => {
    if (!transcript.trim()) return;

    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Multi-stage animated pipeline
    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const result = await analyzeTranscriptAPI(transcript, title, settings);
      clearInterval(stepInterval);
      setAnalysisStep(4);
      setTimeout(() => {
        setIsAnalyzing(false);
        onAnalysisComplete(result);
      }, 500);
    } catch (err) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-question">Processing Pipeline • Step 1 & 2</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Multi-Speaker Conversation Ingestion</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Meeting Input & Transcript Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px', marginTop: '4px' }}>
            Paste raw meeting notes, upload audio/transcript files, or speak live. MeetFlow AI uses deep contextual analysis to separate concrete tasks from speculative suggestions.
          </p>
        </div>

        {/* 1-Click Action */}
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || !transcript.trim()}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '1rem', borderRadius: '12px' }}
        >
          <Sparkles size={18} />
          <span>{isAnalyzing ? 'Analyzing with AI...' : 'Analyze & Extract Tasks'}</span>
        </button>
      </div>

      {/* Preset Realistic Samples Picker */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              One-Click Benchmark Transcripts (Ready to Test)
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click to preload real scenario</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          {SAMPLE_TRANSCRIPTS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              style={{
                background: 'rgba(14, 19, 31, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f1f5f9' }}>{sample.title}</span>
                <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>{sample.tag}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {sample.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Title & Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1', minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Meeting Title
            </label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning, Client Sync, Design Review"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* File Upload Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.vtt,.srt,.docx,.json"
              style={{ display: 'none' }}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-sm"
              title="Upload transcript file (.txt, .vtt, .srt)"
            >
              <Upload size={14} />
              <span>Import File</span>
            </button>

            {/* Live Dictation / Speech-to-Text */}
            <button
              onClick={toggleRecording}
              className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
              title="Speak or dictate live notes"
            >
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{isRecording ? 'Stop Dictating' : 'Dictate Live'}</span>
            </button>
          </div>
        </div>

        {/* Audio Waveform visualization during recording */}
        {isRecording && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}>
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
            <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>
              Listening... Speak your meeting discussions into your microphone.
            </span>
          </div>
        )}

        {/* Upload feedback toast */}
        {uploadFeedback && (
          <div style={{
            fontSize: '0.8rem',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={14} />
            <span>{uploadFeedback}</span>
          </div>
        )}

        {/* Transcript Textarea */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Meeting Transcript / Notes Content
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {transcript.length} characters • {transcript.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <textarea
            className="textarea"
            style={{ minHeight: '220px', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste transcript with speaker cues (e.g. Ayush: Let's finish the login page by Friday. Rahul suggested adding Google login...)"
          />
        </div>

        {/* Active Analysis Pipeline Animation */}
        {isAnalyzing && (
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="var(--accent-primary)" style={{ animation: 'spin 2s linear infinite' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  AI Automation Engine Processing
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                Step {analysisStep + 1} of 5
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${((analysisStep + 1) / 5) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                transition: 'width 0.4s ease'
              }} />
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {pipelineSteps[analysisStep]}
            </p>
          </div>
        )}

        {/* Footer trigger */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <HelpCircle size={14} />
            <span>AI automatically detects speakers, deadlines, commitments vs suggestions, and duplicate tasks.</span>
          </div>

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || !transcript.trim()}
            className="btn btn-primary"
          >
            <span>{isAnalyzing ? 'Extracting...' : 'Run Pipeline'}</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>

      {/* Quick Summary Pill after Analysis */}
      {analysisData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-confirmed-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="var(--color-confirmed)" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{analysisData.confirmed_count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirmed Tasks</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-suggestion-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="var(--color-suggestion)" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{analysisData.suggestion_count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggestions Pending</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-conflict-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} color="var(--color-conflict)" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{analysisData.conflict_count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conflicts / Warnings</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-question-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Volume2 size={20} color="var(--color-question)" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{analysisData.detected_attendees.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Attendees</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
