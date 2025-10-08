export type UserRole = 'parent' | 'therapist';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: Date;
}

export interface Child {
  id: string;
  nationalId: string;
  name: string;
  parentId: string;
  therapistId?: string;
  createdAt: Date;
}

export type TherapyType = 'speech' | 'behavior' | 'emotional' | 'motor';

export interface WeeklyGoal {
  goal: string;
  category: TherapyType;
}

export interface TreatmentPlan {
  id: string;
  childId: string;
  therapistId: string;
  voiceRecordingUrl?: string;
  transcription?: string;
  documentUrl?: string;
  summary?: string;
  therapyType?: TherapyType;
  weeklyGoals: WeeklyGoal[] | string[]; // Support both old and new format
  dailyTasks: DailyTask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  demoVideoUrl?: string;
  demoVideoSuggestion?: string;
  weeklyGoalIndex: number;
  editable: boolean;
  createdAt: Date;
}

export interface HomeTherapySession {
  id: string;
  childId: string;
  taskId: string;
  parentId: string;
  completed: boolean;
  feedback?: 'easy' | 'struggled' | 'needs_practice';
  notes?: string;
  childMood?: 'happy' | 'neutral' | 'frustrated';
  completedAt?: Date;
  createdAt: Date;
}

export interface Progress {
  id: string;
  childId: string;
  weekStart: Date;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  objectiveTargets?: ObjectiveTarget[];
  engagementRate: number;
}

export interface ObjectiveTarget {
  name: string;
  target: string;
  current: string;
  unit: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderRole: UserRole;
  receiverId: string;
  childId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
