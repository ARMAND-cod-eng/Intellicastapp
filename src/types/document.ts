export interface DocumentContent {
  id: string;
  title: string;
  content: string;
  structure: DocumentStructure;
  metadata: DocumentMetadata;
  processingStatus: ProcessingStatus;
}

export interface DocumentStructure {
  chapters?: Chapter[];
  sections?: Section[];
  headings?: Heading[];
  citations?: Citation[];
  images?: ImageReference[];
  tables?: TableReference[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  level: number;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  level: number;
  parentId?: string;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
  index: number;
}

export interface Citation {
  id: string;
  text: string;
  source?: string;
  index: number;
}

export interface ImageReference {
  id: string;
  alt?: string;
  caption?: string;
  index: number;
}

export interface TableReference {
  id: string;
  caption?: string;
  index: number;
  data?: string[][];
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  language?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
}

export interface ProcessingStatus {
  stage: 'uploading' | 'extracting' | 'analyzing' | 'structuring' | 'completed' | 'error';
  progress: number;
  message?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ProcessingResult {
  success: boolean;
  document?: DocumentContent;
  error?: ProcessingError;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: any;
}