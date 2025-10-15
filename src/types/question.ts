export interface IQuestion {
  _id?: string;
  examId: string;
  type: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'essay';
  questionText: string;
  questionImage?: string;
  options: IQuestionOption[];
  correctAnswers: string[];
  marks: number;
  negativeMarks: number;
  explanation?: string;
  explanationImage?: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  order: number;
  statistics: IQuestionStatistics;
  isInQuestionBank: boolean;
  questionBankId?: string;
  version: number;
  parentQuestion?: string;
  createdBy: string;
  lastModifiedBy?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuestionOption {
  text: string;
  image?: string;
  isCorrect: boolean;
  order: number;
}

export interface IQuestionStatistics {
  totalAttempts: number;
  correctAttempts: number;
  averageTime: number;
  difficultyIndex: number;
  discriminationIndex: number;
  lastUpdated: Date;
}

export interface IQuestionCreate {
  examId: string;
  type: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'essay';
  questionText: string;
  questionImage?: string;
  options?: IQuestionOption[];
  correctAnswers?: string[];
  marks: number;
  negativeMarks?: number;
  explanation?: string;
  explanationImage?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  order?: number;
  isInQuestionBank?: boolean;
}

export interface IQuestionUpdate {
  type?: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'essay';
  questionText?: string;
  questionImage?: string;
  options?: IQuestionOption[];
  correctAnswers?: string[];
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  explanationImage?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  order?: number;
  isInQuestionBank?: boolean;
}

export interface IQuestionFilters {
  examId?: string;
  type?: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'essay';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  isInQuestionBank?: boolean;
  createdBy?: string;
  search?: string;
}

export interface IQuestionSort {
  field: 'order' | 'marks' | 'difficulty' | 'createdAt' | 'totalAttempts' | 'correctAttempts';
  order: 'asc' | 'desc';
}

export interface IQuestionPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IQuestionListResponse {
  questions: IQuestion[];
  pagination: IQuestionPagination;
  filters: IQuestionFilters;
  sort: IQuestionSort;
}
