export interface Team {
  teamId: number;
  teamName: string;
  memberCount?: number;
}

export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: 'Employee' | 'Manager' | 'Admin';
  teamId?: number;
  teamName?: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ProjectMember {
  userId: number;
  fullName: string;
  role: string;
  joinedAt: string;
}

export interface Project {
  projectId: number;
  projectName: string;
  description?: string;
  status: string;
  managerId: number;
  managerName?: string;
  teamId?: number;
  teamName?: string;
  totalTasks?: number;
  totalHours?: number;
  memberCount?: number;
  isCurrentUserMember?: boolean;
  externalClickUpListId?: string;
}

export interface Task {
  taskId: number;
  taskName: string;
  description?: string;
  projectId: number;
  projectName?: string;
  assignedUserId?: number;
  assignedUserName?: string;
  assignedTeamId?: number;
  assignedTeamName?: string;
  status: string;
  priority: string;
  clickUpTaskId?: string;
  estimatedHours?: number;
  loggedHours?: number;
}

export interface ClickUpTaskSummary {
  id: string;
  name: string;
  status?: string;
  priority?: string;
  estimatedHours?: number;
  url: string;
}

export interface TimeEntry {
  timeEntryId: number;
  userId: number;
  userName: string;
  projectId: number;
  projectName: string;
  taskId?: number;
  taskName?: string;
  manualTaskName?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  durationHours: number;
  workType?: string;
  description?: string;
  source: string;
  status: string;
  rejectionReason?: string;
  relatedCommitIds?: string;
  relatedClickUpTaskId?: string;
  clickUpUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryRequest {
  projectId: number;
  taskId?: number;
  manualTaskName?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  workType?: string;
  description?: string;
  source?: string;
  status?: string;
}

export interface UpdateTimeEntryRequest {
  projectId?: number;
  taskId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  workType?: string;
  description?: string;
  status?: string;
}

export interface TimeEntryFilter {
  userId?: number;
  projectId?: number;
  taskId?: number;
  fromDate?: string;
  toDate?: string;
  status?: string;
}

export interface ActiveTimer {
  activeTimerId: number;
  projectId: number;
  projectName: string;
  taskId?: number;
  taskName?: string;
  startedAt: string;
  accumulatedMinutes: number;
  isPaused: boolean;
  description?: string;
  currentDurationMinutes: number;
}

export interface TimerStartRequest {
  projectId: number;
  taskId?: number;
  description?: string;
}

export interface TaskHoursItem {
  taskName: string;
  hours: number;
}

export interface Dashboard {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  weekBreakdown: DailyHours[];
  projectBreakdown: ProjectHours[];
  recentEntries: TimeEntry[];
  activeTimer?: ActiveTimer;
  todayProjectBreakdown: ProjectHours[];
  todayTaskBreakdown: TaskHoursItem[];
  weekProjectBreakdown: ProjectHours[];
  weekTaskBreakdown: TaskHoursItem[];
  monthProjectBreakdown: ProjectHours[];
  monthTaskBreakdown: TaskHoursItem[];
}

export interface ManagerDashboard {
  projectStats: ProjectTaskStats[];
  teamMemberHours: MemberHours[];
  teamWeekBreakdown: DailyHours[];
  teamTotalHoursThisWeek: number;
  teamTotalHoursThisMonth: number;
}

export interface ProjectTaskStats {
  projectId: number;
  projectName: string;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionPercent: number;
  totalHours: number;
}

export interface MemberHours {
  userId: number;
  fullName: string;
  weekHours: number;
  monthHours: number;
}

export interface DailyHours {
  date: string;
  hours: number;
  entries: number;
}

export interface ProjectHours {
  projectId: number;
  projectName: string;
  hours: number;
}

export interface TeamStats {
  teamId: number;
  teamName: string;
  memberCount: number;
  projectCount: number;
  weekHours: number;
  monthHours: number;
  totalTasks: number;
  doneTasks: number;
  completionPercent: number;
}

export interface TopEmployee {
  userId: number;
  fullName: string;
  teamName?: string;
  weekHours: number;
  monthHours: number;
}

export interface AdminDashboard {
  totalTeams: number;
  totalEmployees: number;
  totalProjects: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  teamStats: TeamStats[];
  topEmployees: TopEmployee[];
}

export interface ReportingRules {
  rulesId: number;
  isTaskMandatory: boolean;
  maxHoursPerDay: number;
  retroactiveDaysAllowed: number;
  updatedAt: string;
  updatedByUserId?: number;
  updatedByUserName?: string;
}

export interface UpdateReportingRulesRequest {
  isTaskMandatory: boolean;
  maxHoursPerDay: number;
  retroactiveDaysAllowed: number;
}
