export interface IExam {
  _id?: string;
  title: string;
  description?: string;
  instructions?: string;
  duration: number; // in minutes
  startDate: Date;
  endDate: Date;
  passMark: number;
  totalMarks: number;
  examType: 'practice' | 'quiz' | 'midterm' | 'final' | 'assignment';
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  assignedTo: string[];
  assignedGroups: string[];
  settings: IExamSettings;
  questions: string[];
  questionOrder: IQuestionOrder[];
  statistics: IExamStatistics;
  tags: string[];
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublic: boolean;
  isTemplate: boolean;
  templateId?: string;
  version: number;
  parentExam?: string;
  timezone: string;
  notificationSettings: INotificationSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExamSettings {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxAttempts: number;
  allowRetake: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  showResultsAfter?: Date;
  fullScreenMode: boolean;
  preventCopyPaste: boolean;
  detectTabSwitch: boolean;
  allowLateSubmission: boolean;
  lateSubmissionPenalty: number;
  autoSubmit: boolean;
  warningTime: number;
  allowReview: boolean;
  reviewTime: number;
  negativeMarking: boolean;
  negativeMarkingPercentage: number;
  timePerQuestion?: number;
  allowCalculator: boolean;
  allowNotes: boolean;
  proctoringEnabled: boolean;
  webcamRequired: boolean;
  microphoneRequired: boolean;
  screenRecording: boolean;
}

export interface IQuestionOrder {
  questionId: string;
  order: number;
}

export interface IExamStatistics {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  lastUpdated: Date;
}

export interface INotificationSettings {
  sendReminder: boolean;
  reminderTime: number;
  sendResults: boolean;
  sendToInstructor: boolean;
}

export interface IExamCreate {
  title: string;
  description?: string;
  instructions?: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  passMark: number;
  examType?: 'practice' | 'quiz' | 'midterm' | 'final' | 'assignment';
  assignedTo?: string[];
  assignedGroups?: string[];
  settings?: Partial<IExamSettings>;
  tags?: string[];
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isPublic?: boolean;
  timezone?: string;
  notificationSettings?: Partial<INotificationSettings>;
}

export interface IExamUpdate {
  title?: string;
  description?: string;
  instructions?: string;
  duration?: number;
  startDate?: Date;
  endDate?: Date;
  passMark?: number;
  examType?: 'practice' | 'quiz' | 'midterm' | 'final' | 'assignment';
  assignedTo?: string[];
  assignedGroups?: string[];
  settings?: Partial<IExamSettings>;
  tags?: string[];
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isPublic?: boolean;
  timezone?: string;
  notificationSettings?: Partial<INotificationSettings>;
}

export interface IExamFilters {
  status?: 'draft' | 'published' | 'archived';
  examType?: 'practice' | 'quiz' | 'midterm' | 'final' | 'assignment';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdBy?: string;
  assignedTo?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface IExamSort {
  field: 'title' | 'startDate' | 'endDate' | 'createdAt' | 'totalAttempts' | 'averageScore';
  order: 'asc' | 'desc';
}

export interface IExamPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IExamListResponse {
  exams: IExam[];
  pagination: IExamPagination;
  filters: IExamFilters;
  sort: IExamSort;
}
