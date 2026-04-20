export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type RecurrenceType = "daily" | "weekly";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  review: "レビュー",
  done: "完了",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-status-todo/15 text-status-todo border-status-todo/30",
  in_progress: "bg-status-progress/15 text-status-progress border-status-progress/30",
  review: "bg-status-review/15 text-status-review border-status-review/30",
  done: "bg-status-done/15 text-status-done border-status-done/30",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-priority-low/15 text-priority-low border-priority-low/30",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
  high: "bg-priority-high/15 text-priority-high border-priority-high/30",
  urgent: "bg-priority-urgent/15 text-priority-urgent border-priority-urgent/30",
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export interface Member {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  email: string | null;
  is_active: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string | null;
  is_archived: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  assignee_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  template_id: string | null;
  progress: number;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  description: string | null;
  recurrence: RecurrenceType;
  weekdays: number[] | null;
  generate_time: string;
  default_priority: TaskPriority;
  default_assignee_id: string | null;
  default_project_id: string | null;
  due_offset_days: number;
  is_active: boolean;
}
