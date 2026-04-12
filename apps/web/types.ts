
export enum StageStatus {
  ACTIVE = 'ACTIVE',
}

export enum TaskMode {
  PENDING = 'PENDING'
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER'
}

export interface SubResource {
  id: string;
  title: string;
  type: 'vocabulary' | 'phrases' | 'knowledge';
}

export interface Stage {
  id: number;
  title: string;
  status: StageStatus;
  subResources: SubResource[];
}

export interface UserProfile {
  username: string;
  realName: string;
  studentNo: string;
  role: string;
  company: string;
  avatarUrl: string;
  // Student specific
  nationality?: string;
  age?: number;
  gender?: string;
  hskLevel?: string;
  major?: string;
}

export interface TaskDetail {
  stageId: number;
  mode: TaskMode;
  title: string;
  taskId: string;
  description: string;
  subDescription?: string;
  feedbackOrTipTitle?: string;
  feedbackOrTipContent: string;
  score?: number; 
}

export interface ResourceEntry {
  id?: string;
  term: string;
  explanation: string;
  example?: string;
}

export interface StageResourceSet {
  vocabulary: ResourceEntry[];
  phrases: ResourceEntry[];
  knowledge: ResourceEntry[];
}

// --- Simulation Types ---
export interface ChatMessage {
  id: string;
  sender: 'USER' | 'OPPONENT' | 'SYSTEM';
  text: string;
  timestamp: string;
  isError?: boolean;
  turnIndex?: number;
  coachNote?: string;
  assessment?: SimulationAssessment;
  trace?: SimulationTrace;
  personaSnapshot?: {
    cultureHints?: string[];
    difficultyAdjustment?: 'down' | 'keep' | 'up';
  };
}

export interface SimulationAssessment {
  score?: number;
  strengths?: string[];
  risks?: string[];
  summary?: string;
}

export interface SimulationTrace {
  provider: 'deepseek' | 'compatible' | 'openclaw';
  usedTools?: string[];
  usedWebSearch?: boolean;
  degraded?: boolean;
}

export interface SimulationOrchestration {
  roleplayReply: string;
  coachNote?: string | null;
  assessment?: SimulationAssessment;
  personaSnapshot?: {
    cultureHints?: string[];
    difficultyAdjustment?: 'down' | 'keep' | 'up';
  };
  trace?: SimulationTrace;
}

export interface OpponentProfile {
  name: string;
  role: string;
  avatarInitials: string;
}

// --- Coaching Types ---
export interface Annotation {
  id: string;
  targetMessageId: string;
  tags: string[];
  analysis: string;
  correction: string;
  relatedResource: string;
  groupConsensus?: string;
}

export interface CoachingSession {
  summary: string;
  chatHistory: ChatMessage[];
  annotations: Record<string, Annotation>;
}

// --- Group Discussion Types ---
export interface DiscussionMessage {
  id: string;
  member: string;
  content: string;
  isUser?: boolean;
}

export interface DiscussionItem {
  id: string;
  sourceMember: string;
  snippet: string;
  messages: DiscussionMessage[];
}

export interface DiscussionSession {
  caseTitle: string;
  items: DiscussionItem[];
}
