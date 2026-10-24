import React, { useState, useRef } from 'react';
import { 
  Upload, Mic, MicOff, Sparkles, CheckCircle2, 
  Layers, ArrowRight, Volume2, HelpCircle, Video,
  RefreshCw, ShieldCheck, Zap
} from 'lucide-react';
import { SAMPLE_TRANSCRIPTS } from '../mockData';
import type { AppSettings, MeetingAnalysisResponse, GoogleMeetConference } from '../types';
import { analyzeTranscriptAPI } from '../api';
import { MOCK_GOOGLE_MEET_CONFERENCES, getGoogleOAuthUrl, GOOGLE_OAUTH_CONFIG } from '../googleMeet';

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
  
  // Google Meet Auto-Sync (Vipto) State
  const [isGoogleConnected, setIsGoogleConnected] = useState(true);
  const [selectedConference, setSelectedConference] = useState<GoogleMeetConference>(MOCK_GOOGLE_MEET_CONFERENCES[0]);
  const [isSyncingMeet, setIsSyncingMeet] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const pipelineSteps = [
    'Authenticating and validating Google Meet transcript session...',
    'Cleaning conversation and segmenting multi-speaker dialogue...',
    'Extracting decisions, commitments, owners & deadlines with Gemini AI...',
    'Quarantining exploratory suggestions (Google login) from confirmed commitments...',
    'Validating conflicts, duplicate tasks & structuring review package...'
  ];

  const handleSelectSample = (sample: typeof SAMPLE_TRANSCRIPTS[0]) => {
    setTitle(sample.title);
    setTranscript(sample.content);
    setUploadFeedback(`Loaded template: ${sample.title}`);
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  const handleSelectGoogleMeet = (conf: GoogleMeetConference) => {
    setSelectedConference(conf);
    if (conf.transcriptState !== 'FILE_GENERATED') {
      setUploadFeedback(`Warning: Transcript for "${conf.title}" is still processing (state: ${conf.transcriptState}).`);
      setTimeout(() => setUploadFeedback(null), 3500);
      return;
    }

    if (conf.transcriptContent) {
      setTitle(conf.title);
      setTranscript(conf.transcriptContent);
      setUploadFeedback(`✓ Auto-retrieved Google Meet transcript for "${conf.title}" (${conf.conferenceId})`);
      setTimeout(() => setUploadFeedback(null), 4000);
    }
  };

  const handleConnectGoogleOAuth = () => {
    const url = getGoogleOAuthUrl();
    window.open(url, '_blank', 'width=580,height=680');
    setIsGoogleConnected(true);
    setUploadFeedback(`Initiated Google OAuth 2.0 flow (Client: ${GOOGLE_OAUTH_CONFIG.clientId.slice(0, 15)}...)`);
    setTimeout(() => setUploadFeedback(null), 4000);
  };

  const handleImportAndRunMeet = async (conf: GoogleMeetConference) => {
    if (!conf.transcriptContent) return;

    setIsSyncingMeet(true);
    setTitle(conf.title);
    setTranscript(conf.transcriptContent);
    setUploadFeedback(`⚡ Auto-retrieved Google Meet transcript (${conf.conferenceId}). Initiating AI Extraction...`);

    setIsAnalyzing(true);
    setAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const result = await analyzeTranscriptAPI(conf.transcriptContent, conf.title, settings);
      clearInterval(stepInterval);
      setAnalysisStep(4);
      setTimeout(() => {
        setIsAnalyzing(false);
        setIsSyncingMeet(false);
        onAnalysisComplete(result);
      }, 500);
    } catch (err) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setIsSyncingMeet(false);
      console.error(err);
    }
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
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
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
            Paste raw meeting notes, upload files, dictate live, or <strong>auto-sync directly from Google Meet (Vipto Integration)</strong>. MeetFlow AI separates confirmed commitments from unfinalized suggestions.
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

      {/* Google Meet Auto-Sync Integration Hub (Vipto Integration) */}
      <div className="glass-panel" style={{
        padding: '22px',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 20, 34, 0.76) 100%)',
        boxShadow: '0 0 25px rgba(6, 182, 212, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
            }}>
              <Video size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Google Meet Auto-Sync & Retrieval (Vipto Platform)
                </h3>
                <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>
                  <ShieldCheck size={12} />
                  {isGoogleConnected ? 'OAuth 2.0 Connected' : 'Connect Google Meet'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Auto-detects completed meetings when transcripts reach state <strong style={{ color: '#34d399' }}>FILE_GENERATED</strong> via Meet REST API & Workspace Events.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleConnectGoogleOAuth}
              className="btn btn-secondary btn-sm"
              title="Re-authenticate Google OAuth 2.0 credentials"
              style={{ fontSize: '0.78rem', border: '1px solid rgba(6, 182, 212, 0.3)' }}
            >
              <RefreshCw size={13} />
              <span>OAuth Client: {GOOGLE_OAUTH_CONFIG.clientId.slice(0, 12)}...</span>
            </button>
          </div>
        </div>

        {/* Live Detected Google Meet Sessions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          {MOCK_GOOGLE_MEET_CONFERENCES.map((conf) => {
            const isSelected = selectedConference.conferenceId === conf.conferenceId;
            const isReady = conf.transcriptState === 'FILE_GENERATED';

            return (
              <div
                key={conf.conferenceId}
                onClick={() => handleSelectGoogleMeet(conf)}
                style={{
                  background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(14, 19, 31, 0.75)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: isReady ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  opacity: isReady ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                    {conf.title}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isReady ? '#34d399' : '#fbbf24',
                    border: `1px solid ${isReady ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                  }}>
                    {conf.transcriptState}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{conf.startTime}</span>
                  <span>{(conf.attendees || []).length} Attendees</span>
                </div>

                {isReady && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#06b6d4' }}>
                      ✓ Ready for 1-Click Extraction
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportAndRunMeet(conf);
                      }}
                      className="btn btn-sm btn-primary"
                      disabled={isAnalyzing}
                      style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
                    >
                      <Zap size={12} />
                      <span>{isSyncingMeet ? 'Processing...' : 'Auto-Import & Run'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
            placeholder="Paste transcript with speaker cues (e.g. Ayush: I will complete the login page by Friday. Rahul suggested adding Google login...)"
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
                  MeetFlow AI Engine • Multi-Stage Processing Pipeline
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggestions Quarantined</div>
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
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{(analysisData.detected_attendees || []).length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Attendees</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
