import type { MeetingAnalysisResponse } from './types';

export const SAMPLE_TRANSCRIPTS = [
  {
    id: 'sample-1',
    title: 'HACKNOVA Pitch Benchmark (Slide 9 Example)',
    tag: 'Official Spec',
    description: 'Ayush login page (Friday) & Rahul Google login suggestion (pending approval).',
    content: `Ayush: I will complete the login page by Friday.
Rahul: Rahul suggested adding Google login, but the team hasn't finalized it yet.
Rahul: Ayush, can you also update the API documentation by Monday?
Ayush: Yes, I will update the API documentation by Monday.`
  },
  {
    id: 'sample-2',
    title: 'Sprint 14 Planning & Conflict Detection',
    tag: 'Duplicate & Ambiguity',
    description: 'Contains duplicate tasks, missing assignees, and ambiguous deadlines.',
    content: `Alex: Team, we need to optimize our PostgreSQL database queries before Friday.
Sarah: Wait, I already committed to database query optimization and indexing for Friday.
Alex: Okay, then someone should also test the checkout checkout workflow soon.
Rahul: I will finalize the Stripe checkout integration and payment webhooks by Thursday.
Priya: Rahul suggested adding crypto payments, but the leadership team hasn't approved it yet.
Alex: Do we need a separate staging database for QA? That's still an open question.`
  },
  {
    id: 'sample-3',
    title: 'Mobile App & UX Redesign Sync',
    tag: 'Feature Discussion',
    description: 'Navigation drawer, bottom tabs suggestion, and analytics deliverable.',
    content: `David: Team, let's complete the mobile navigation drawer redesign by Wednesday.
Elena: Rahul suggested switching to bottom tab navigation instead, but we haven't finalized user testing.
David: Also, someone needs to deliver the team analytics dashboard. Currently unassigned.
Elena: I will take full ownership of the analytics dashboard and finish it by Friday.`
  }
];

export const INITIAL_MEETING_DATA: MeetingAnalysisResponse = {
  meeting_id: 'meet-hacknova-01',
  title: 'Hacknova Sprint Sync — Auth & API Planning',
  transcript: SAMPLE_TRANSCRIPTS[0].content,
  summary: {
    key_decisions: [
      'Confirmed task: Complete the login page (Assigned to Ayush, due Friday)',
      'Confirmed task: Update and publish API documentation (Assigned to Ayush, due Monday)'
    ],
    discussion_points: [
      'Suggestion: Rahul suggested adding Google login, but the team has not finalized it.',
      'Clarification needed on OAuth 2.0 provider requirements.'
    ],
    next_meeting: 'Friday 10:00 AM Sprint Review',
    sentiment: 'productive'
  },
  tasks: [
    {
      id: 'task-auth-01',
      title: 'Complete the login page',
      description: 'Ayush will complete the login page by Friday.',
      assignee: 'Ayush',
      deadline: 'Friday',
      classification: 'confirmed',
      priority: 'high',
      status: 'todo',
      approval_status: 'pending',
      confidence: 0.99,
      tags: ['frontend', 'auth', 'login-page'],
      estimated_hours: 6.0,
      source_quote: 'Ayush: I will complete the login page by Friday.',
      conflicts: []
    },
    {
      id: 'task-sugg-02',
      title: 'Add Google login (Evaluate OAuth integration)',
      description: "Rahul suggested adding Google login, but the team hasn't finalized it.",
      assignee: 'Rahul',
      deadline: 'Pending Approval',
      classification: 'suggestion',
      priority: 'low',
      status: 'backlog',
      approval_status: 'pending',
      confidence: 0.92,
      tags: ['suggestion', 'exploratory', 'google-login'],
      estimated_hours: 3.5,
      source_quote: "Rahul: Rahul suggested adding Google login, but the team hasn't finalized it yet.",
      conflicts: [
        {
          id: 'conf-sugg-1',
          conflict_type: 'ambiguous_deadline',
          message: 'Suggestion has no approved deadline. Prevented from automated project board assignment.',
          severity: 'info',
          suggested_fix: 'Review in human approval gate before promoting to confirmed task.'
        }
      ]
    },
    {
      id: 'task-docs-03',
      title: 'Update and publish API documentation',
      description: 'Ayush will update the API documentation by Monday.',
      assignee: 'Ayush',
      deadline: 'Monday',
      classification: 'confirmed',
      priority: 'medium',
      status: 'todo',
      approval_status: 'pending',
      confidence: 0.96,
      tags: ['backend', 'documentation', 'api'],
      estimated_hours: 3.0,
      source_quote: 'Yes, I will update the API documentation by Monday.',
      conflicts: []
    }
  ],
  detected_attendees: ['Ayush', 'Rahul'],
  conflict_count: 1,
  confirmed_count: 2,
  suggestion_count: 1,
  unresolved_count: 0,
  analyzed_at: new Date().toISOString()
};
