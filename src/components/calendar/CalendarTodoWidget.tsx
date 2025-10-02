/**
 * IntelliCast AI - Smart Calendar & Todo Widget
 * A feature-rich sidebar calendar with integrated AI-powered todo list
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Circle,
  Clock,
  Sparkles,
  ListTodo,
  X,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Play,
  Pause,
  Timer,
  ChevronRight as SubtaskIcon,
  List,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Video,
  MapPin,
  Users,
  Bell,
  Repeat,
  Globe
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { TodoTask, DayInfo, TaskStatus, TaskPriority, Event, Appointment, ItemType } from './types';
import './CalendarTodoWidget.css';

interface CalendarTodoWidgetProps {
  onTaskCreate?: (task: Omit<TodoTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTaskToggle?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
}

const CalendarTodoWidget: React.FC<CalendarTodoWidgetProps> = ({
  onTaskCreate,
  onTaskToggle,
  onTaskDelete
}) => {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTodoList, setShowTodoList] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);
  const [trackingStartTime, setTrackingStartTime] = useState<Date | null>(null);
  const [trackingElapsed, setTrackingElapsed] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // New state for tabs and item types
  const [activeTab, setActiveTab] = useState<ItemType>('task');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Get calendar days for current month
  const getCalendarDays = (): DayInfo[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: DayInfo[] = [];
    const today = new Date();

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isToday: false,
        isSelected: false,
        isCurrentMonth: false,
        tasks: [],
        events: [],
        hasItems: false
      });
    }

    // Add days from current month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dayTasks = tasks.filter(task =>
        task.date.toDateString() === date.toDateString()
      );

      days.push({
        date,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isCurrentMonth: true,
        tasks: dayTasks,
        events: [],
        hasItems: dayTasks.length > 0
      });
    }

    // Add days from next month to complete grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isToday: false,
        isSelected: false,
        isCurrentMonth: false,
        tasks: [],
        events: [],
        hasItems: false
      });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowTodoList(true);
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;

    const newTask: TodoTask = {
      id: Date.now().toString(),
      title: newTaskInput,
      date: selectedDate,
      dueDate: selectedDate,
      status: 'todo',
      completed: false,
      priority: 'medium',
      category: 'general',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTasks([...tasks, newTask]);
    onTaskCreate?.(newTask);
    setNewTaskInput('');
    setShowAddTask(false);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            completed: !task.completed,
            status: !task.completed ? 'completed' : 'todo',
            completedDate: !task.completed ? new Date() : undefined,
            updatedAt: new Date()
          }
        : task
    ));
    onTaskToggle?.(taskId);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    onTaskDelete?.(taskId);
  };

  const selectedDateTasks = tasks.filter(
    task => task.date.toDateString() === selectedDate.toDateString()
  );

  const getTasksForToday = () => {
    const today = new Date();
    return tasks.filter(task => task.date.toDateString() === today.toDateString());
  };

  const calendarDays = getCalendarDays();
  const todayTasks = getTasksForToday();

  const getPriorityColor = (priority: TaskPriority) => {
    const colors = {
      low: theme === 'professional-dark' ? '#34D399' : '#10B981',
      medium: theme === 'professional-dark' ? '#60A5FA' : '#3B82F6',
      high: theme === 'professional-dark' ? '#FBBF24' : '#F59E0B',
      urgent: theme === 'professional-dark' ? '#F87171' : '#EF4444'
    };
    return colors[priority];
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      todo: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280',
      in_progress: theme === 'professional-dark' ? '#60A5FA' : '#3B82F6',
      review: theme === 'professional-dark' ? '#A78BFA' : '#8B5CF6',
      blocked: theme === 'professional-dark' ? '#F87171' : '#EF4444',
      completed: theme === 'professional-dark' ? '#34D399' : '#10B981',
      archived: theme === 'professional-dark' ? '#6B7280' : '#9CA3AF'
    };
    return colors[status];
  };

  const getStatusLabel = (status: TaskStatus) => {
    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      blocked: 'Blocked',
      completed: 'Completed',
      archived: 'Archived'
    };
    return labels[status];
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            status: newStatus,
            completed: newStatus === 'completed',
            completedDate: newStatus === 'completed' ? new Date() : undefined,
            updatedAt: new Date()
          }
        : task
    ));
  };

  const handlePriorityChange = (taskId: string, newPriority: TaskPriority) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, priority: newPriority, updatedAt: new Date() }
        : task
    ));
  };

  const handleStartTimeTracking = (taskId: string) => {
    setTrackingTaskId(taskId);
    setTrackingStartTime(new Date());
    setTrackingElapsed(0);
  };

  const handleStopTimeTracking = () => {
    if (!trackingTaskId || !trackingStartTime) return;

    const elapsed = Math.floor((new Date().getTime() - trackingStartTime.getTime()) / 60000); // in minutes

    setTasks(tasks.map(task =>
      task.id === trackingTaskId
        ? {
            ...task,
            actualDuration: (task.actualDuration || 0) + elapsed,
            updatedAt: new Date()
          }
        : task
    ));

    setTrackingTaskId(null);
    setTrackingStartTime(null);
    setTrackingElapsed(0);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleAddSubtask = (parentId: string) => {
    if (!newSubtaskInput.trim()) return;

    const newSubtask: TodoTask = {
      id: Date.now().toString(),
      title: newSubtaskInput,
      date: selectedDate,
      dueDate: selectedDate,
      status: 'todo',
      completed: false,
      priority: 'medium',
      category: 'general',
      parentTaskId: parentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTasks(tasks.map(task =>
      task.id === parentId
        ? {
            ...task,
            subtasks: [...(task.subtasks || []), newSubtask],
            updatedAt: new Date()
          }
        : task
    ));

    setNewSubtaskInput('');
    setAddingSubtaskTo(null);
  };

  const handleToggleSubtask = (parentId: string, subtaskId: string) => {
    setTasks(tasks.map(task =>
      task.id === parentId
        ? {
            ...task,
            subtasks: task.subtasks?.map(subtask =>
              subtask.id === subtaskId
                ? {
                    ...subtask,
                    completed: !subtask.completed,
                    status: !subtask.completed ? 'completed' : 'todo',
                    updatedAt: new Date()
                  }
                : subtask
            ),
            updatedAt: new Date()
          }
        : task
    ));
  };

  const handleDeleteSubtask = (parentId: string, subtaskId: string) => {
    setTasks(tasks.map(task =>
      task.id === parentId
        ? {
            ...task,
            subtasks: task.subtasks?.filter(st => st.id !== subtaskId),
            updatedAt: new Date()
          }
        : task
    ));
  };

  // Update elapsed time every second when tracking
  useEffect(() => {
    if (!trackingTaskId || !trackingStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - trackingStartTime.getTime()) / 1000);
      setTrackingElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [trackingTaskId, trackingStartTime]);

  // Voice Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNewTaskInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="calendar-todo-widget">
      {/* Header */}
      <div className="widget-header">
        <div className="header-left">
          <CalendarIcon className="header-icon" />
          <span className="header-title">Calendar</span>
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Calendar Navigation */}
          <div className="calendar-nav">
            <button onClick={previousMonth} className="nav-btn">
              <ChevronLeft size={16} />
            </button>
            <span className="current-month">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="nav-btn">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {/* Day headers */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="day-header">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((dayInfo, index) => (
              <button
                key={index}
                className={`calendar-day ${dayInfo.isToday ? 'is-today' : ''} ${
                  dayInfo.isSelected ? 'is-selected' : ''
                } ${!dayInfo.isCurrentMonth ? 'other-month' : ''} ${
                  dayInfo.hasItems ? 'has-items' : ''
                }`}
                onClick={() => handleDateSelect(dayInfo.date)}
              >
                <span className="day-number">{dayInfo.date.getDate()}</span>
                {dayInfo.hasItems && <div className="task-indicator" />}
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <ListTodo size={14} />
              <span>{todayTasks.length} Today</span>
            </div>
            <div className="stat-item">
              <Clock size={14} />
              <span>{tasks.filter(t => !t.completed).length} Pending</span>
            </div>
          </div>

          {/* Tabs for Task/Event/Appointment */}
          <div className="item-type-tabs">
            <button
              className={`tab-btn ${activeTab === 'task' ? 'active' : ''}`}
              onClick={() => setActiveTab('task')}
            >
              <ListTodo size={14} />
              <span>Task</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'event' ? 'active' : ''}`}
              onClick={() => setActiveTab('event')}
            >
              <CalendarIcon size={14} />
              <span>Event</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'appointment' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointment')}
            >
              <Clock size={14} />
              <span>Appointment</span>
              {activeTab === 'appointment' && <span className="new-badge">New</span>}
            </button>
          </div>

          {/* Todo List Toggle */}
          <button
            className="todo-toggle-btn"
            onClick={() => setShowTodoList(!showTodoList)}
          >
            {activeTab === 'task' && <ListTodo size={16} />}
            {activeTab === 'event' && <CalendarIcon size={16} />}
            {activeTab === 'appointment' && <Clock size={16} />}
            <span>
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
              {activeTab === 'task' ? 'Tasks' : activeTab === 'event' ? 'Events' : 'Appointments'}
            </span>
            <span className="task-count">
              {activeTab === 'task' ? selectedDateTasks.length :
               activeTab === 'event' ? events.filter(e => e.date.toDateString() === selectedDate.toDateString()).length :
               appointments.filter(a => a.date.toDateString() === selectedDate.toDateString()).length}
            </span>
          </button>

          {/* Todo List for Selected Date */}
          {showTodoList && (
            <div className="todo-list-container">
              <div className="todo-list-header">
                <h4>
                  {selectedDate.toDateString() === new Date().toDateString()
                    ? 'Today'
                    : selectedDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                </h4>
                <button
                  className="add-task-btn"
                  onClick={() => setShowAddTask(!showAddTask)}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add Task/Event/Appointment Input */}
              {showAddTask && activeTab === 'task' && (
                <div className="add-task-input">
                  <input
                    type="text"
                    placeholder="Add a task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    autoFocus
                  />
                  <button
                    onClick={handleVoiceInput}
                    className={`voice-input-btn ${isListening ? 'listening' : ''}`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                  <button onClick={handleAddTask} className="submit-task-btn">
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTask(false);
                      setNewTaskInput('');
                    }}
                    className="cancel-task-btn"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Add Event Form */}
              {showAddTask && activeTab === 'event' && (
                <div className="add-event-form">
                  <div className="form-header">
                    <h5>Add Event</h5>
                    <button onClick={() => setShowAddTask(false)} className="close-form-btn">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="form-body">
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Event title"
                        className="form-input"
                      />
                      <button
                        onClick={handleVoiceInput}
                        className={`voice-input-btn ${isListening ? 'listening' : ''}`}
                        title="Voice input"
                      >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                      </button>
                    </div>
                    <div className="form-row">
                      <input type="time" placeholder="Start time" className="form-input" />
                      <span>–</span>
                      <input type="time" placeholder="End time" className="form-input" />
                    </div>
                    <div className="form-group">
                      <select className="form-select">
                        <option value="">Time zone</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input type="checkbox" />
                        <Video size={16} />
                        <span>Add Google Meet video conferencing</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Add guests (email addresses)"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Add location"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <textarea
                        placeholder="Add description"
                        className="form-textarea"
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <select className="form-select">
                        <option value="30">30 minutes before</option>
                        <option value="60">1 hour before</option>
                        <option value="1440">1 day before</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button className="btn-save">Save Event</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Appointment Form */}
              {showAddTask && activeTab === 'appointment' && (
                <div className="add-appointment-form">
                  <div className="form-header">
                    <h5>Schedule Appointment</h5>
                    <button onClick={() => setShowAddTask(false)} className="close-form-btn">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="form-body">
                    <div className="appointment-info-banner">
                      <p>Create a booking page you can share with others so they can book time with you themselves</p>
                      <button className="learn-more-btn">Learn more</button>
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Appointment title"
                        className="form-input"
                      />
                      <button
                        onClick={handleVoiceInput}
                        className={`voice-input-btn ${isListening ? 'listening' : ''}`}
                        title="Voice input"
                      >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                      </button>
                    </div>
                    <div className="form-row">
                      <input type="time" placeholder="Start time" className="form-input" defaultValue="17:30" />
                      <span>–</span>
                      <input type="time" placeholder="End time" className="form-input" defaultValue="18:30" />
                    </div>
                    <div className="form-group">
                      <select className="form-select">
                        <option value="">Time zone</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <select className="form-select">
                        <option value="">Calendar</option>
                        <option value="personal">Personal Calendar</option>
                        <option value="work">Work Calendar</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <select className="form-select">
                        <option value="busy">Busy</option>
                        <option value="default">Default visibility</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button className="btn-setup-schedule">Set up the schedule</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Task List */}
              <div className="tasks-list">
                {selectedDateTasks.length === 0 ? (
                  <div className="empty-state">
                    <Circle className="empty-icon" />
                    <p>No tasks for this day</p>
                  </div>
                ) : (
                  selectedDateTasks.map((task) => (
                    <React.Fragment key={task.id}>
                    <div
                      className={`task-item ${task.completed ? 'completed' : ''}`}
                    >
                      <button
                        className="task-checkbox"
                        onClick={() => handleToggleTask(task.id)}
                      >
                        {task.completed ? (
                          <Check size={12} />
                        ) : (
                          <Circle size={12} />
                        )}
                      </button>
                      <div className="task-content">
                        <span className="task-title">{task.title}</span>
                        {task.aiGenerated && (
                          <Sparkles className="ai-badge" size={10} />
                        )}
                        <div className="task-meta">
                          <select
                            className="status-selector"
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: getStatusColor(task.status) }}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                          </select>
                          <select
                            className="priority-selector"
                            value={task.priority}
                            onChange={(e) => handlePriorityChange(task.id, e.target.value as TaskPriority)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: getPriorityColor(task.priority) }}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <div className="time-tracking-info">
                            {task.actualDuration && task.actualDuration > 0 && (
                              <span className="tracked-time">
                                <Timer size={10} />
                                {formatDuration(task.actualDuration)}
                              </span>
                            )}
                            {trackingTaskId === task.id && (
                              <span className="tracking-timer">
                                {Math.floor(trackingElapsed / 60)}:{String(trackingElapsed % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className={`time-track-btn ${trackingTaskId === task.id ? 'tracking' : ''}`}
                        onClick={() => trackingTaskId === task.id ? handleStopTimeTracking() : handleStartTimeTracking(task.id)}
                        title={trackingTaskId === task.id ? 'Stop tracking' : 'Start tracking'}
                      >
                        {trackingTaskId === task.id ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <button
                        className="add-subtask-btn"
                        onClick={() => setAddingSubtaskTo(task.id)}
                        title="Add subtask"
                      >
                        <List size={12} />
                      </button>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <button
                          className="expand-btn"
                          onClick={() => toggleTaskExpansion(task.id)}
                          title={expandedTasks.has(task.id) ? 'Collapse' : 'Expand'}
                        >
                          <SubtaskIcon
                            size={12}
                            style={{
                              transform: expandedTasks.has(task.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease'
                            }}
                          />
                          <span className="subtask-count">{task.subtasks.length}</span>
                        </button>
                      )}
                      <button
                        className="delete-task-btn"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {addingSubtaskTo === task.id && (
                      <div className="add-subtask-input">
                        <input
                          type="text"
                          placeholder="Add subtask..."
                          value={newSubtaskInput}
                          onChange={(e) => setNewSubtaskInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                          autoFocus
                        />
                        <button onClick={() => handleAddSubtask(task.id)} className="submit-subtask-btn">
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setAddingSubtaskTo(null);
                            setNewSubtaskInput('');
                          }}
                          className="cancel-subtask-btn"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {expandedTasks.has(task.id) && task.subtasks && task.subtasks.length > 0 && (
                      <div className="subtasks-list">
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className={`subtask-item ${subtask.completed ? 'completed' : ''}`}>
                            <button
                              className="task-checkbox"
                              onClick={() => handleToggleSubtask(task.id, subtask.id)}
                            >
                              {subtask.completed ? (
                                <Check size={10} />
                              ) : (
                                <Circle size={10} />
                              )}
                            </button>
                            <span className="subtask-title">{subtask.title}</span>
                            <button
                              className="delete-subtask-btn"
                              onClick={() => handleDeleteSubtask(task.id, subtask.id)}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CalendarTodoWidget;
