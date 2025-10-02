/**
 * Calendar & Project Management Type Definitions
 * IntelliCast AI - Advanced Project Management System (ClickUp-inspired)
 */

// ============================================================================
// Task Status Types
// ============================================================================

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'blocked'
  | 'completed'
  | 'archived';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskCategory =
  | 'podcast'
  | 'research'
  | 'content'
  | 'meeting'
  | 'personal'
  | 'general'
  | 'development'
  | 'marketing'
  | 'design';

// ============================================================================
// Advanced Task Interface (ClickUp-inspired)
// ============================================================================

export interface TodoTask {
  // Core Properties
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  completed: boolean;

  // Dates & Time
  date: Date;
  dueDate?: Date;
  startDate?: Date;
  completedDate?: Date;

  // Priority & Organization
  priority: TaskPriority;
  category: TaskCategory;
  tags?: string[];
  labels?: string[];

  // Time Management
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // tracked time in minutes
  timeTracking?: TimeTrackingEntry[];

  // Hierarchy & Dependencies
  parentTaskId?: string;
  subtasks?: TodoTask[];
  dependencies?: string[]; // IDs of tasks this depends on
  blockedBy?: string[]; // IDs of tasks blocking this one

  // Assignment & Collaboration
  assignee?: string;
  assignedTo?: string[];
  watchers?: string[];

  // Custom Fields
  customFields?: Record<string, any>;

  // Progress & Metrics
  progressPercent?: number;
  checklistItems?: ChecklistItem[];

  // AI Features
  aiGenerated?: boolean;
  aiSuggestions?: string[];
  automationRules?: AutomationRule[];

  // Recurring Tasks
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;

  // Attachments & Links
  attachments?: Attachment[];
  links?: Link[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastModifiedBy?: string;

  // Project Management
  projectId?: string;
  sprintId?: string;
  epicId?: string;

  // Comments & Activity
  comments?: Comment[];
  activityLog?: ActivityLog[];
}

// ============================================================================
// Time Tracking
// ============================================================================

export interface TimeTrackingEntry {
  id: string;
  taskId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  description?: string;
  billable?: boolean;
}

// ============================================================================
// Checklist
// ============================================================================

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: Date;
  order: number;
}

// ============================================================================
// Automation
// ============================================================================

export interface AutomationRule {
  id: string;
  trigger: 'status_change' | 'date_reached' | 'field_update' | 'assignment';
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  action: {
    type: 'set_status' | 'assign_to' | 'add_comment' | 'send_notification' | 'create_subtask';
    params: Record<string, any>;
  };
  enabled: boolean;
}

// ============================================================================
// Recurrence
// ============================================================================

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

// ============================================================================
// Attachments & Links
// ============================================================================

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: Date;
  uploadedBy?: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  type: 'external' | 'internal' | 'reference';
}

// ============================================================================
// Comments & Activity
// ============================================================================

export interface Comment {
  id: string;
  taskId: string;
  userId?: string;
  userName?: string;
  content: string;
  mentions?: string[];
  reactions?: Record<string, string[]>; // emoji -> user IDs
  createdAt: Date;
  updatedAt?: Date;
  parentCommentId?: string; // for threaded comments
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId?: string;
  action: 'created' | 'updated' | 'completed' | 'commented' | 'assigned' | 'status_changed';
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  description?: string;
}

// ============================================================================
// Project & Organization
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tasks: TodoTask[];
  members?: string[];
  createdAt: Date;
  archived?: boolean;
}

export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  goals?: string[];
  tasks: string[]; // task IDs
  status: 'planning' | 'active' | 'completed';
}

export interface Epic {
  id: string;
  name: string;
  description?: string;
  color?: string;
  tasks: string[]; // task IDs
  targetDate?: Date;
  progressPercent?: number;
}

// ============================================================================
// Calendar Events
// ============================================================================

export type ItemType = 'task' | 'event' | 'appointment';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: 'task' | 'event' | 'reminder' | 'meeting' | 'deadline';
  color?: string;
  completed?: boolean;
  relatedTaskId?: string;
  attendees?: string[];
  location?: string;
  meetingLink?: string;
}

// ============================================================================
// Event (Google Calendar style)
// ============================================================================

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  timeZone?: string;
  location?: string;

  // Google Meet Integration
  hasVideoConference?: boolean;
  meetingLink?: string;
  meetingPlatform?: 'google-meet' | 'zoom' | 'teams' | 'custom';

  // Attendees
  attendees?: EventAttendee[];

  // Notifications
  notifications?: EventNotification[];

  // Recurrence
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  color?: string;

  // Visibility
  visibility?: 'default' | 'public' | 'private';

  // Status
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface EventAttendee {
  email: string;
  name?: string;
  optional?: boolean;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface EventNotification {
  method: 'email' | 'popup' | 'sms';
  minutes: number; // minutes before event
}

// ============================================================================
// Appointment (Booking/Scheduling)
// ============================================================================

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration?: number; // in minutes
  timeZone?: string;

  // Booking Information
  bookingPageUrl?: string;
  bookingPageEnabled?: boolean;
  allowSelfBooking?: boolean;

  // Attendee Information
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  attendeeNotes?: string;

  // Availability Settings
  bufferTime?: number; // minutes before/after
  maxBookingsPerDay?: number;
  advanceBookingDays?: number; // how far in advance can people book

  // Status
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  confirmationSent?: boolean;
  reminderSent?: boolean;

  // Calendar
  calendar?: string;
  visibility?: 'default' | 'busy' | 'free';

  // Notifications
  notifications?: EventNotification[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;

  // Custom fields for form data
  customFields?: Record<string, any>;
}

// ============================================================================
// Views & Display
// ============================================================================

export interface DayInfo {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  tasks: TodoTask[];
  events: CalendarEvent[];
  hasItems: boolean;
  workload?: number; // total estimated hours for the day
}

export type ViewMode = 'calendar' | 'list' | 'board' | 'timeline' | 'gantt' | 'workload';

export interface ViewSettings {
  mode: ViewMode;
  groupBy?: 'status' | 'priority' | 'assignee' | 'project' | 'date';
  filterBy?: TaskFilter;
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// ============================================================================
// AI Suggestions
// ============================================================================

export interface TaskSuggestion {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedDuration: number;
  reasoning: string;
  suggestedDate?: Date;
  suggestedAssignee?: string;
  relatedTasks?: string[];
}

// ============================================================================
// Analytics & Reports
// ============================================================================

export interface ProductivityMetrics {
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
  overdueT asks: number;
  tasksCompletedOnTime: number;
  totalTimeTracked: number; // in minutes
  tasksByPriority: Record<TaskPriority, number>;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByCategory: Record<TaskCategory, number>;
  productivityScore: number; // 0-100
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

export interface WorkloadAnalysis {
  totalEstimatedHours: number;
  totalTrackedHours: number;
  capacityUtilization: number; // percentage
  overloadedDates: Date[];
  availableCapacity: number;
  burndownRate: number;
}
