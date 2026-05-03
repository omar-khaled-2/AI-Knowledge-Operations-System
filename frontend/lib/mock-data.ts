export interface Project {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  sourceCount: number;
  sessionCount: number;
  insightCount: number;
  lastUpdated: string;
  color: "pink" | "teal" | "lavender" | "peach" | "ochre" | "cream";
}

export interface Session {
  id: string;
  projectId: string;
  name: string;
  messageCount: number;
  updatedAt: string;
  preview: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceCitation[];
}

export interface SourceCitation {
  id: string;
  documentName: string;
  pageNumber?: number;
  snippet: string;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  sourceType: "upload" | "notion" | "slack" | "google-drive" | "confluence" | "github";
  createdAt: string;
  size: number | string;
  status: "processed" | "processing" | "error" | "embedded";
  pageCount?: number;
  mimeType?: string;
  objectKey?: string;
}

export interface KnowledgeSource {
  id: string;
  projectId: string;
  type: "notion" | "slack" | "google-drive" | "confluence" | "github";
  name: string;
  status: "connected" | "disconnected" | "syncing";
  lastSync: string;
  itemCount: number;
}

export interface Insight {
  id: string;
  projectId: string;
  type: "action-item" | "trend" | "connection" | "anomaly";
  title: string;
  description: string;
  confidence: number;
  relatedDocuments: string[];
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  projectId?: string;
  type: "chat" | "document" | "source" | "insight";
  action: string;
  target: string;
  timestamp: string;
  user?: string;
}

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Product Strategy 2024",
    description: "Strategic planning, competitive analysis, and roadmap decisions",
    documentCount: 24,
    sourceCount: 3,
    sessionCount: 18,
    insightCount: 12,
    lastUpdated: "2024-01-15T10:30:00Z",
    color: "teal",
  },
  {
    id: "proj-2",
    name: "Customer Research",
    description: "User interviews, feedback analysis, and persona development",
    documentCount: 56,
    sourceCount: 5,
    sessionCount: 32,
    insightCount: 28,
    lastUpdated: "2024-01-14T16:45:00Z",
    color: "pink",
  },
  {
    id: "proj-3",
    name: "Engineering Knowledge",
    description: "Technical docs, architecture decisions, and runbooks",
    documentCount: 89,
    sourceCount: 4,
    sessionCount: 45,
    insightCount: 15,
    lastUpdated: "2024-01-15T08:20:00Z",
    color: "lavender",
  },
  {
    id: "proj-4",
    name: "Marketing Playbook",
    description: "Campaign planning, content strategy, and brand guidelines",
    documentCount: 31,
    sourceCount: 2,
    sessionCount: 12,
    insightCount: 8,
    lastUpdated: "2024-01-13T14:00:00Z",
    color: "peach",
  },
];

// Mock Sessions
export const mockSessions: Session[] = [
  {
    id: "sess-1",
    projectId: "proj-1",
    name: "Q4 Strategy Review",
    messageCount: 24,
    updatedAt: "2024-01-15T10:30:00Z",
    preview: "What were the key outcomes from our Q4 planning session?",
  },
  {
    id: "sess-2",
    projectId: "proj-1",
    name: "Competitor Analysis",
    messageCount: 18,
    updatedAt: "2024-01-14T16:45:00Z",
    preview: "Compare our pricing strategy with competitors",
  },
  {
    id: "sess-3",
    projectId: "proj-1",
    name: "Roadmap Questions",
    messageCount: 12,
    updatedAt: "2024-01-13T09:00:00Z",
    preview: "When is the mobile app scheduled for release?",
  },
  {
    id: "sess-4",
    projectId: "proj-2",
    name: "User Interview Insights",
    messageCount: 32,
    updatedAt: "2024-01-14T16:45:00Z",
    preview: "Summarize the top pain points from user interviews",
  },
  {
    id: "sess-5",
    projectId: "proj-2",
    name: "Persona Validation",
    messageCount: 15,
    updatedAt: "2024-01-13T11:20:00Z",
    preview: "Do our personas align with the recent survey data?",
  },
  {
    id: "sess-6",
    projectId: "proj-3",
    name: "API Documentation Help",
    messageCount: 28,
    updatedAt: "2024-01-15T08:20:00Z",
    preview: "How do I authenticate with the new REST API?",
  },
  {
    id: "sess-7",
    projectId: "proj-3",
    name: "Architecture Decision",
    messageCount: 22,
    updatedAt: "2024-01-14T13:10:00Z",
    preview: "Why did we choose PostgreSQL over MongoDB?",
  },
  {
    id: "sess-8",
    projectId: "proj-3",
    name: "Deployment Runbook",
    messageCount: 10,
    updatedAt: "2024-01-12T15:30:00Z",
    preview: "Walk me through the production deployment process",
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: "msg-1",
    sessionId: "sess-1",
    role: "user",
    content: "What were the key outcomes from our Q4 planning session?",
    timestamp: "2024-01-15T09:00:00Z",
  },
  {
    id: "msg-2",
    sessionId: "sess-1",
    role: "assistant",
    content: "Based on the Q4 planning documents, here are the key outcomes:\n\n1. **Revenue Target**: $2.5M ARR by end of Q4\n2. **Product Launch**: Mobile app v2.0 scheduled for October\n3. **Team Growth**: Hire 3 engineers and 2 designers\n4. **Market Expansion**: Launch in 2 new geographic regions\n5. **Partnership**: Strategic partnership with Acme Corp signed\n\nThe planning session emphasized sustainable growth over rapid scaling.",
    timestamp: "2024-01-15T09:01:00Z",
    sources: [
      { id: "src-1", documentName: "Q4 Strategy Doc", snippet: "Revenue target set at $2.5M ARR" },
      { id: "src-2", documentName: "Product Roadmap", snippet: "Mobile v2.0 launch October 2024" },
    ],
  },
  {
    id: "msg-3",
    sessionId: "sess-1",
    role: "user",
    content: "What risks were identified?",
    timestamp: "2024-01-15T09:05:00Z",
  },
  {
    id: "msg-4",
    sessionId: "sess-1",
    role: "assistant",
    content: "The Q4 planning identified several key risks:\n\n**High Priority:**\n- Talent acquisition in competitive market\n- Infrastructure scaling for 3x user growth\n- Regulatory compliance in new regions\n\n**Medium Priority:**\n- Dependence on single cloud provider\n- Seasonal demand fluctuations\n\n**Mitigation Strategies:**\n- Begin recruiting pipeline 60 days earlier\n- Implement multi-cloud architecture\n- Engage legal counsel in target markets",
    timestamp: "2024-01-15T09:06:00Z",
    sources: [
      { id: "src-3", documentName: "Risk Assessment", snippet: "Talent acquisition identified as highest risk" },
    ],
  },
  {
    id: "msg-5",
    sessionId: "sess-6",
    role: "user",
    content: "How do I authenticate with the new REST API?",
    timestamp: "2024-01-15T08:00:00Z",
  },
  {
    id: "msg-6",
    sessionId: "sess-6",
    role: "assistant",
    content: "The new REST API uses OAuth 2.0 with JWT tokens. Here's how to authenticate:\n\n**Step 1: Obtain Client Credentials**\nRegister your application in the developer portal to get `client_id` and `client_secret`.\n\n**Step 2: Request Access Token**\n```\nPOST /oauth/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials&\nclient_id=YOUR_CLIENT_ID&\nclient_secret=YOUR_CLIENT_SECRET\n```\n\n**Step 3: Use the Token**\nInclude the access token in the Authorization header:\n```\nAuthorization: Bearer YOUR_ACCESS_TOKEN\n```\n\nTokens expire after 1 hour. Use the refresh token flow to get a new token without re-authenticating.",
    timestamp: "2024-01-15T08:01:00Z",
    sources: [
      { id: "src-4", documentName: "API Authentication Guide", snippet: "OAuth 2.0 with JWT tokens" },
      { id: "src-5", documentName: "Developer Portal", snippet: "Token expiration: 1 hour" },
    ],
  },
];

// Mock Documents
export const mockDocuments: Document[] = [
  {
    id: "doc-1",
    projectId: "proj-1",
    name: "Q4 Strategy Document",
    sourceType: "upload",
    createdAt: "2024-01-10T10:00:00Z",
    size: 2516582,
    status: "processed",
    pageCount: 24,
  },
  {
    id: "doc-2",
    projectId: "proj-1",
    name: "Competitive Analysis 2024",
    sourceType: "notion",
    createdAt: "2024-01-08T14:30:00Z",
    size: 1887437,
    status: "processed",
    pageCount: 18,
  },
  {
    id: "doc-3",
    projectId: "proj-1",
    name: "Product Roadmap",
    sourceType: "upload",
    createdAt: "2024-01-05T09:00:00Z",
    size: 3355443,
    status: "processed",
    pageCount: 32,
  },
  {
    id: "doc-4",
    projectId: "proj-2",
    name: "User Interview Transcripts",
    sourceType: "upload",
    createdAt: "2024-01-12T11:00:00Z",
    size: 5872026,
    status: "processed",
    pageCount: 89,
  },
  {
    id: "doc-5",
    projectId: "proj-2",
    name: "Survey Results Q4",
    sourceType: "google-drive",
    createdAt: "2024-01-11T16:00:00Z",
    size: 911360,
    status: "processed",
    pageCount: 12,
  },
  {
    id: "doc-6",
    projectId: "proj-2",
    name: "Persona Development",
    sourceType: "notion",
    createdAt: "2024-01-09T10:30:00Z",
    size: 1258291,
    status: "processing",
    pageCount: 8,
  },
  {
    id: "doc-7",
    projectId: "proj-3",
    name: "API Documentation",
    sourceType: "github",
    createdAt: "2024-01-14T08:00:00Z",
    size: 466944,
    status: "processed",
  },
  {
    id: "doc-8",
    projectId: "proj-3",
    name: "Architecture Decision Records",
    sourceType: "confluence",
    createdAt: "2024-01-13T14:00:00Z",
    size: 2202010,
    status: "processed",
    pageCount: 15,
  },
  {
    id: "doc-9",
    projectId: "proj-3",
    name: "Deployment Runbook",
    sourceType: "github",
    createdAt: "2024-01-12T09:00:00Z",
    size: 348160,
    status: "processed",
  },
  {
    id: "doc-10",
    projectId: "proj-4",
    name: "Brand Guidelines",
    sourceType: "upload",
    createdAt: "2024-01-10T13:00:00Z",
    size: 9332326,
    status: "processed",
    pageCount: 45,
  },
];

// Mock Knowledge Sources
export const mockKnowledgeSources: KnowledgeSource[] = [
  {
    id: "ks-1",
    projectId: "proj-1",
    type: "notion",
    name: "Notion Workspace",
    status: "connected",
    lastSync: "2024-01-15T10:00:00Z",
    itemCount: 156,
  },
  {
    id: "ks-2",
    projectId: "proj-1",
    type: "slack",
    name: "Product Team Slack",
    status: "connected",
    lastSync: "2024-01-15T09:30:00Z",
    itemCount: 2341,
  },
  {
    id: "ks-3",
    projectId: "proj-2",
    type: "google-drive",
    name: "Research Drive",
    status: "connected",
    lastSync: "2024-01-14T18:00:00Z",
    itemCount: 89,
  },
  {
    id: "ks-4",
    projectId: "proj-2",
    type: "slack",
    name: "User Research Slack",
    status: "syncing",
    lastSync: "2024-01-15T10:15:00Z",
    itemCount: 567,
  },
  {
    id: "ks-5",
    projectId: "proj-3",
    type: "github",
    name: "Engineering Repo",
    status: "connected",
    lastSync: "2024-01-15T08:00:00Z",
    itemCount: 423,
  },
  {
    id: "ks-6",
    projectId: "proj-3",
    type: "confluence",
    name: "Engineering Wiki",
    status: "connected",
    lastSync: "2024-01-14T16:00:00Z",
    itemCount: 198,
  },
  {
    id: "ks-7",
    projectId: "proj-4",
    type: "notion",
    name: "Marketing Wiki",
    status: "disconnected",
    lastSync: "2024-01-10T12:00:00Z",
    itemCount: 0,
  },
];

// Mock Insights
export const mockInsights: Insight[] = [
  {
    id: "ins-1",
    projectId: "proj-1",
    type: "action-item",
    title: "Follow up on Acme Corp partnership terms",
    description: "The partnership agreement draft has been sitting for 5 days without review. Legal team needs to approve section 4.2 by end of week.",
    confidence: 0.92,
    relatedDocuments: ["doc-1", "doc-3"],
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "ins-2",
    projectId: "proj-1",
    type: "trend",
    title: "Increasing mention of 'mobile-first' in strategy docs",
    description: "Over the past 30 days, references to mobile-first strategy have increased 340% across planning documents.",
    confidence: 0.87,
    relatedDocuments: ["doc-1", "doc-3"],
    createdAt: "2024-01-14T16:00:00Z",
  },
  {
    id: "ins-3",
    projectId: "proj-2",
    type: "connection",
    title: "Persona 'Tech-Savvy Tom' overlaps with engineering docs",
    description: "The technical depth described in the 'Tech-Savvy Tom' persona aligns closely with content in Engineering Knowledge base.",
    confidence: 0.78,
    relatedDocuments: ["doc-4", "doc-5"],
    createdAt: "2024-01-14T12:00:00Z",
  },
  {
    id: "ins-4",
    projectId: "proj-2",
    type: "anomaly",
    title: "Survey response rate dropped 40% this week",
    description: "The weekly pulse survey typically gets 80% response rate but only received 48% this week. Consider investigating team morale.",
    confidence: 0.95,
    relatedDocuments: ["doc-5"],
    createdAt: "2024-01-13T09:00:00Z",
  },
  {
    id: "ins-5",
    projectId: "proj-3",
    type: "action-item",
    title: "Update API docs with new auth flow",
    description: "The authentication documentation is outdated and doesn't reflect the new OAuth 2.0 implementation deployed last week.",
    confidence: 0.89,
    relatedDocuments: ["doc-7"],
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "ins-6",
    projectId: "proj-3",
    type: "trend",
    title: "Documentation coverage improving",
    description: "Code-to-documentation ratio has improved from 1:0.3 to 1:0.7 over the past quarter.",
    confidence: 0.84,
    relatedDocuments: ["doc-7", "doc-8"],
    createdAt: "2024-01-14T14:00:00Z",
  },
];

// Mock Activity Feed
export const mockActivity: ActivityItem[] = [
  {
    id: "act-1",
    projectId: "proj-1",
    type: "chat",
    action: "started a new conversation",
    target: "Q4 Strategy Review",
    timestamp: "2024-01-15T10:30:00Z",
    user: "Alex Chen",
  },
  {
    id: "act-2",
    projectId: "proj-2",
    type: "document",
    action: "uploaded",
    target: "User Interview Transcripts",
    timestamp: "2024-01-15T09:15:00Z",
    user: "Sarah Miller",
  },
  {
    id: "act-3",
    projectId: "proj-3",
    type: "source",
    action: "connected",
    target: "GitHub Repository",
    timestamp: "2024-01-15T08:00:00Z",
    user: "James Wilson",
  },
  {
    id: "act-4",
    projectId: "proj-1",
    type: "insight",
    action: "generated new insight",
    target: "Partnership follow-up needed",
    timestamp: "2024-01-14T18:00:00Z",
  },
  {
    id: "act-5",
    projectId: "proj-2",
    type: "chat",
    action: "asked about",
    target: "Persona validation",
    timestamp: "2024-01-14T16:45:00Z",
    user: "Morgan Taylor",
  },
  {
    id: "act-6",
    projectId: "proj-4",
    type: "document",
    action: "updated",
    target: "Brand Guidelines",
    timestamp: "2024-01-14T13:00:00Z",
    user: "Jordan Lee",
  },
  {
    id: "act-7",
    type: "insight",
    action: "system generated",
    target: "3 new insights across projects",
    timestamp: "2024-01-14T12:00:00Z",
  },
];

// Helper functions
export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}

export function getSessionsByProjectId(projectId: string): Session[] {
  return mockSessions.filter((s) => s.projectId === projectId);
}

export function getSessionById(id: string): Session | undefined {
  return mockSessions.find((s) => s.id === id);
}

export function getMessagesBySessionId(sessionId: string): Message[] {
  return mockMessages.filter((m) => m.sessionId === sessionId);
}

export function getDocumentsByProjectId(projectId: string): Document[] {
  return mockDocuments.filter((d) => d.projectId === projectId);
}

export function getDocumentById(id: string): Document | undefined {
  return mockDocuments.find((d) => d.id === id);
}

export function getSourcesByProjectId(projectId: string): KnowledgeSource[] {
  return mockKnowledgeSources.filter((s) => s.projectId === projectId);
}

export function getInsightsByProjectId(projectId: string): Insight[] {
  return mockInsights.filter((i) => i.projectId === projectId);
}

export function getActivityByProjectId(projectId?: string): ActivityItem[] {
  if (projectId) {
    return mockActivity.filter((a) => a.projectId === projectId || !a.projectId);
  }
  return mockActivity;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getBrandColor(color: string): string {
  const colors: Record<string, string> = {
    pink: "#ff4d8b",
    teal: "#1a3a3a",
    lavender: "#b8a4ed",
    peach: "#ffb084",
    ochre: "#e8b94a",
    cream: "#f5f0e0",
  };
  return colors[color] || "#f5f0e0";
}

export function getSourceIcon(type: string): string {
  const icons: Record<string, string> = {
    notion: "N",
    slack: "S",
    "google-drive": "G",
    confluence: "C",
    github: "GH",
    upload: "U",
  };
  return icons[type] || "?";
}
