export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'administrator' | 'manager' | 'employee' | 'contractor';
export type UserStatus = 'pending' | 'active' | 'disabled';
export type HolidayStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'change_requested';
export type TaskStatus = 'planned' | 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
export type ExpenseCategory = 'mileage' | 'fuel' | 'hotels' | 'meals' | 'flights' | 'parking' | 'tolls' | 'tools' | 'parts' | 'office' | 'entertainment' | 'other';
export type CalendarEventType = 'holiday' | 'sickness' | 'customer_visit' | 'farm_work' | 'site_work' | 'office' | 'home_working' | 'travel' | 'training' | 'meeting' | 'general_work';
export type NotificationType = 'holiday_submitted' | 'holiday_approved' | 'holiday_rejected' | 'holiday_changed' | 'expense_submitted' | 'expense_approved' | 'expense_rejected' | 'task_assigned' | 'task_changed' | 'task_overdue' | 'schedule_changed' | 'timesheet_reminder';
export type SicknessType = 'sick' | 'medical_appointment' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  holiday_allowance: number;
  holiday_access: boolean;
  timesheet_access: boolean;
  expenses_access: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkingPattern {
  id: string;
  user_id: string;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
  weekly_hours: number;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
  created_at: string;
}

export interface BankHoliday {
  id: string;
  date: string;
  name: string;
  country: string;
}

export interface Holiday {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  working_days: number;
  status: HolidayStatus;
  notes: string | null;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  original_holiday_id: string | null;
  leave_year: number;
  entered_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: Profile;
  decided_by_profile?: Profile;
}

export interface HolidayBalance {
  allowance: number;
  adjustments: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface SicknessRecord {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  sickness_type: SicknessType;
  private_notes: string | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  customer_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  site_contact: string | null;
  site_phone: string | null;
  access_notes: string | null;
  parking_notes: string | null;
  health_safety_notes: string | null;
  general_notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface Vehicle {
  id: string;
  name: string;
  registration: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string | null;
  serial_no: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  event_type: CalendarEventType;
  title: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  customer_id: string | null;
  location_id: string | null;
  vehicle_id: string | null;
  equipment_id: string | null;
  notes: string | null;
  holiday_id: string | null;
  sickness_id: string | null;
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  customer?: Customer;
  location?: Location;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  customer_id: string | null;
  location_id: string | null;
  vehicle_id: string | null;
  equipment_id: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  parent_task_id: string | null;
  auto_rollover: boolean;
  completed_by: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  assignees?: Profile[];
  customer?: Customer;
  location?: Location;
  created_by_profile?: Profile;
}

export interface TimesheetEntry {
  id: string;
  period_id: string;
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
  customer_id: string | null;
  location_id: string | null;
  is_auto_populated: boolean;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetPeriod {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  entries?: TimesheetEntry[];
}

export interface Expense {
  id: string;
  user_id: string;
  claim_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  receipt_url: string | null;
  notes: string | null;
  status: ExpenseStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  marked_paid_by: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface MileageClaim {
  id: string;
  user_id: string;
  claim_date: string;
  from_location: string;
  to_location: string;
  business_reason: string;
  distance_miles: number;
  vehicle_reg: string | null;
  rate_per_mile: number;
  calculated_amount: number;
  notes: string | null;
  attachment_url: string | null;
  status: ExpenseStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  marked_paid_by: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  related_user_id: string | null;
  created_at: string;
}

export interface CompanySetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// Supabase Database type (simplified)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      working_patterns: { Row: WorkingPattern; Insert: Partial<WorkingPattern>; Update: Partial<WorkingPattern> };
      bank_holidays: { Row: BankHoliday; Insert: Partial<BankHoliday>; Update: Partial<BankHoliday> };
      holidays: { Row: Holiday; Insert: Partial<Holiday>; Update: Partial<Holiday> };
      sickness_records: { Row: SicknessRecord; Insert: Partial<SicknessRecord>; Update: Partial<SicknessRecord> };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> };
      locations: { Row: Location; Insert: Partial<Location>; Update: Partial<Location> };
      vehicles: { Row: Vehicle; Insert: Partial<Vehicle>; Update: Partial<Vehicle> };
      equipment: { Row: Equipment; Insert: Partial<Equipment>; Update: Partial<Equipment> };
      calendar_events: { Row: CalendarEvent; Insert: Partial<CalendarEvent>; Update: Partial<CalendarEvent> };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      task_assignees: { Row: { task_id: string; user_id: string; assigned_at: string; assigned_by: string | null }; Insert: { task_id: string; user_id: string }; Update: never };
      timesheet_periods: { Row: TimesheetPeriod; Insert: Partial<TimesheetPeriod>; Update: Partial<TimesheetPeriod> };
      timesheet_entries: { Row: TimesheetEntry; Insert: Partial<TimesheetEntry>; Update: Partial<TimesheetEntry> };
      expenses: { Row: Expense; Insert: Partial<Expense>; Update: Partial<Expense> };
      mileage_claims: { Row: MileageClaim; Insert: Partial<MileageClaim>; Update: Partial<MileageClaim> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      company_settings: { Row: CompanySetting; Insert: Partial<CompanySetting>; Update: Partial<CompanySetting> };
    };
    Functions: {
      calculate_working_days: { Args: { p_user_id: string; p_start: string; p_end: string }; Returns: number };
      get_holiday_balance: { Args: { p_user_id: string; p_leave_year: number }; Returns: HolidayBalance[] };
      is_manager_or_admin: { Args: Record<never, never>; Returns: boolean };
      is_admin: { Args: Record<never, never>; Returns: boolean };
    };
  };
}
