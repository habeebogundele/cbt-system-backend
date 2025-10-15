export interface IExamAttempt {
  _id?: string;
  examId: string;
  studentId: string;
  attemptNumber: number;
  status: 'in_progress' | 'submitted' | 'auto_submitted' | 'terminated' | 'abandoned';
  startTime: Date;
  endTime?: Date;
  submittedAt?: Date;
  timeTaken: number;
  score: number;
  percentage: number;
  totalMarks: number;
  passed: boolean;
  grade?: string;
  answers: IAnswer[];
  securityLog: ISecurityEvent[];
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  browserInfo: IBrowserInfo;
  screenResolution: IScreenResolution;
  gradedAt?: Date;
  gradedBy?: string;
  feedback?: string;
  isGraded: boolean;
  gradingMethod: 'automatic' | 'manual' | 'hybrid';
  isUnderReview: boolean;
  reviewReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  performanceMetrics: IPerformanceMetrics;
  sessionId?: string;
  isFullScreen: boolean;
  fullScreenExits: number;
  tabSwitches: number;
  copyAttempts: number;
  rightClicks: number;
  lastSaved: Date;
  autoSaveCount: number;
  networkInfo: INetworkInfo;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnswer {
  questionId: string;
  answer: any;
  isCorrect: boolean;
  marksAwarded: number;
  timeTaken: number;
  isFlagged: boolean;
  isReviewed: boolean;
  answeredAt: Date;
}

export interface ISecurityEvent {
  timestamp: Date;
  event: 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'right_click' | 'window_blur' | 'window_focus' | 'key_press' | 'mouse_activity';
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface IBrowserInfo {
  name?: string;
  version?: string;
  platform?: string;
}

export interface IScreenResolution {
  width?: number;
  height?: number;
}

export interface IPerformanceMetrics {
  averageTimePerQuestion: number;
  questionsAnswered: number;
  questionsFlagged: number;
  questionsReviewed: number;
  totalClicks: number;
  totalKeyStrokes: number;
  idleTime: number;
}

export interface INetworkInfo {
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface IExamAttemptCreate {
  examId: string;
  studentId: string;
  attemptNumber: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  browserInfo?: IBrowserInfo;
  screenResolution?: IScreenResolution;
  sessionId?: string;
  networkInfo?: INetworkInfo;
}

export interface IExamAttemptUpdate {
  status?: 'in_progress' | 'submitted' | 'auto_submitted' | 'terminated' | 'abandoned';
  endTime?: Date;
  submittedAt?: Date;
  answers?: IAnswer[];
  securityLog?: ISecurityEvent[];
  performanceMetrics?: Partial<IPerformanceMetrics>;
  isFullScreen?: boolean;
  fullScreenExits?: number;
  tabSwitches?: number;
  copyAttempts?: number;
  rightClicks?: number;
  lastSaved?: Date;
  autoSaveCount?: number;
}

export interface IExamAttemptFilters {
  examId?: string;
  studentId?: string;
  status?: 'in_progress' | 'submitted' | 'auto_submitted' | 'terminated' | 'abandoned';
  passed?: boolean;
  isGraded?: boolean;
  isUnderReview?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  search?: string;
}

export interface IExamAttemptSort {
  field: 'startTime' | 'submittedAt' | 'score' | 'percentage' | 'timeTaken' | 'createdAt';
  order: 'asc' | 'desc';
}

export interface IExamAttemptPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IExamAttemptListResponse {
  attempts: IExamAttempt[];
  pagination: IExamAttemptPagination;
  filters: IExamAttemptFilters;
  sort: IExamAttemptSort;
}
