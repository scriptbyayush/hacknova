import type { GoogleMeetConference } from './types';

export const GOOGLE_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  projectId: import.meta.env.VITE_GOOGLE_PROJECT_ID || 'project-f09ab5dd-2ed9-4755-bff',
  redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://meetflow.vipto.in/',
  authUri: 'https://accounts.google.com/o/oauth2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/meetings.space.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
};

// Generate official Google OAuth 2.0 Authorization URL
export function getGoogleOAuthUrl(customRedirectUri?: string): string {
  const redirect = customRedirectUri || (typeof window !== 'undefined' ? window.location.origin + '/' : GOOGLE_OAUTH_CONFIG.redirectUri);
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: redirect,
    response_type: 'token id_token',
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
    include_granted_scopes: 'true',
    state: 'meetflow_vipto_auth_' + Date.now(),
    prompt: 'consent'
  });
  return `${GOOGLE_OAUTH_CONFIG.authUri}?${params.toString()}`;
}

// Sample Google Meet conferences with FILE_GENERATED status
export const MOCK_GOOGLE_MEET_CONFERENCES: GoogleMeetConference[] = [
  {
    conferenceId: 'conf-meet-vipto-01',
    spaceId: 'spaces/vip-meet-892',
    title: 'Vipto Sprint Sync — Auth & API Planning (Google Meet)',
    startTime: 'Today, 10:00 AM',
    endTime: 'Today, 10:35 AM',
    transcriptState: 'FILE_GENERATED',
    attendees: ['Ayush (Lead)', 'Rahul (Backend)', 'Priya (QA)'],
    transcriptContent: `Ayush: I will complete the login page by Friday.
Rahul: Rahul suggested adding Google login, but the team hasn't finalized it yet.
Rahul: Ayush, can you also update the API documentation by Monday?
Ayush: Yes, I will update the API documentation by Monday.`,
    transcriptUrl: 'https://docs.google.com/document/d/vipto-meet-transcript-892/view'
  },
  {
    conferenceId: 'conf-meet-vipto-02',
    spaceId: 'spaces/vip-pay-142',
    title: 'Vipto Architecture & Payments Engine Review',
    startTime: 'Yesterday, 3:00 PM',
    endTime: 'Yesterday, 3:45 PM',
    transcriptState: 'FILE_GENERATED',
    attendees: ['Ayush (Lead)', 'Alex (DevOps)', 'Sarah (Database)'],
    transcriptContent: `Alex: Team, we need to optimize our PostgreSQL database queries before Friday.
Sarah: Wait, I already committed to database query optimization and indexing for Friday.
Alex: Okay, then someone should also test the checkout workflow soon.
Rahul: I will finalize the Stripe checkout integration and payment webhooks by Thursday.
Priya: Rahul suggested adding crypto payments, but the leadership team hasn't approved it yet.
Alex: Do we need a separate staging database for QA? That's still an open question.`,
    transcriptUrl: 'https://docs.google.com/document/d/vipto-meet-transcript-142/view'
  },
  {
    conferenceId: 'conf-meet-vipto-03',
    spaceId: 'spaces/vip-mob-551',
    title: 'Vipto Mobile UX & Navigation Standup',
    startTime: 'Oct 22, 11:30 AM',
    endTime: 'Oct 22, 12:00 PM',
    transcriptState: 'PROCESSING',
    attendees: ['David (Mobile)', 'Elena (UI)', 'Ayush'],
    transcriptContent: '',
    transcriptUrl: undefined
  }
];

// Helper to fetch Google Meet conferences from backend or fallback to connected list
export async function fetchGoogleMeetConferences(backendUrl?: string): Promise<GoogleMeetConference[]> {
  if (backendUrl && backendUrl !== 'none') {
    try {
      const res = await fetch(`${backendUrl}/api/google-meet/conferences`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to mock conferences
    }
  }
  return MOCK_GOOGLE_MEET_CONFERENCES;
}
