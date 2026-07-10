-- ============================================================
-- AAS Staff App — Initial Database Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('administrator', 'manager', 'employee', 'contractor');
create type user_status as enum ('pending', 'active', 'disabled');
create type holiday_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'change_requested');
create type sickness_type as enum ('sick', 'medical_appointment', 'other');
create type task_status as enum ('planned', 'not_started', 'in_progress', 'completed', 'cancelled');
create type task_priority as enum ('low', 'normal', 'high', 'urgent');
create type expense_status as enum ('draft', 'submitted', 'approved', 'rejected', 'paid');
create type expense_category as enum (
  'mileage', 'fuel', 'hotels', 'meals', 'flights', 'parking',
  'tolls', 'tools', 'parts', 'office', 'entertainment', 'other'
);
create type calendar_event_type as enum (
  'holiday', 'sickness', 'customer_visit', 'farm_work', 'site_work',
  'office', 'home_working', 'travel', 'training', 'meeting', 'general_work'
);
create type notification_type as enum (
  'holiday_submitted', 'holiday_approved', 'holiday_rejected',
  'holiday_changed', 'expense_submitted', 'expense_approved',
  'expense_rejected', 'task_assigned', 'task_changed', 'task_overdue',
  'schedule_changed', 'timesheet_reminder'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text not null,
  display_name   text,
  phone          text,
  role           user_role not null default 'employee',
  status         user_status not null default 'pending',
  avatar_url     text,
  job_title      text,
  department     text,
  start_date     date,
  end_date       date,
  -- Holiday settings
  holiday_allowance integer not null default 20,  -- days per leave year
  holiday_access    boolean not null default true,
  -- Contractor flags
  timesheet_access  boolean not null default true,
  expenses_access   boolean not null default true,
  -- Approval
  approved_by    uuid references profiles(id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- WORKING PATTERNS (per employee)
-- ============================================================

create table working_patterns (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  mon         boolean not null default true,
  tue         boolean not null default true,
  wed         boolean not null default true,
  thu         boolean not null default true,
  fri         boolean not null default true,
  sat         boolean not null default false,
  sun         boolean not null default false,
  -- hours per week for contracted time
  weekly_hours numeric(4,2) not null default 45,
  effective_from date not null default current_date,
  effective_to   date,
  is_current  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- BANK HOLIDAYS
-- ============================================================

create table bank_holidays (
  id      uuid primary key default uuid_generate_v4(),
  date    date not null unique,
  name    text not null,
  country text not null default 'england-wales'
);

-- ============================================================
-- HOLIDAYS (annual leave requests)
-- ============================================================

create table holidays (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  start_date      date not null,
  end_date        date not null,
  working_days    integer not null,
  status          holiday_status not null default 'pending',
  notes           text,
  -- Decision
  decided_by      uuid references profiles(id),
  decided_at      timestamptz,
  rejection_reason text,
  -- Change/cancel tracking
  original_holiday_id uuid references holidays(id),
  -- Leave year: 1 Apr – 31 Mar
  leave_year      integer not null,  -- e.g. 2025 means Apr 2025 – Mar 2026
  -- Entered by (managers can enter on behalf)
  entered_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Track manual admin adjustments to allowance
create table holiday_adjustments (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  leave_year  integer not null,
  days        integer not null,  -- positive = add, negative = deduct
  reason      text not null,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SICKNESS
-- ============================================================

create table sickness_records (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  start_date      date not null,
  end_date        date,  -- null = ongoing
  sickness_type   sickness_type not null default 'sick',
  private_notes   text,  -- visible only to managers/admins
  entered_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

create table customers (
  id           uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  phone        text,
  email        text,
  notes        text,
  is_active    boolean not null default true,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- LOCATIONS (work sites)
-- ============================================================

create table locations (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  customer_id       uuid references customers(id) on delete set null,
  address_line1     text,
  address_line2     text,
  town              text,
  county            text,
  postcode          text,
  country           text default 'UK',
  latitude          numeric(10,7),
  longitude         numeric(10,7),
  site_contact      text,
  site_phone        text,
  access_notes      text,
  parking_notes     text,
  health_safety_notes text,
  general_notes     text,
  is_active         boolean not null default true,
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- VEHICLES
-- ============================================================

create table vehicles (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  registration text,
  make         text,
  model        text,
  year         integer,
  is_active    boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- EQUIPMENT / MACHINES
-- ============================================================

create table equipment (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  type        text,
  serial_no   text,
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- CALENDAR EVENTS (planned work / assignments)
-- ============================================================

create table calendar_events (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  event_type     calendar_event_type not null,
  title          text,
  start_datetime timestamptz not null,
  end_datetime   timestamptz not null,
  all_day        boolean not null default false,
  customer_id    uuid references customers(id) on delete set null,
  location_id    uuid references locations(id) on delete set null,
  vehicle_id     uuid references vehicles(id) on delete set null,
  equipment_id   uuid references equipment(id) on delete set null,
  notes          text,
  -- Link to source record if event is auto-generated
  holiday_id     uuid references holidays(id) on delete cascade,
  sickness_id    uuid references sickness_records(id) on delete cascade,
  task_id        uuid references tasks(id) on delete cascade,  -- will be created below
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- TASKS
-- ============================================================

create table tasks (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  description     text,
  task_date       date,
  start_time      time,
  end_time        time,
  priority        task_priority not null default 'normal',
  status          task_status not null default 'not_started',
  customer_id     uuid references customers(id) on delete set null,
  location_id     uuid references locations(id) on delete set null,
  vehicle_id      uuid references vehicles(id) on delete set null,
  equipment_id    uuid references equipment(id) on delete set null,
  notes           text,
  -- Recurring
  is_recurring    boolean not null default false,
  recurrence_rule text,  -- iCal RRULE string
  parent_task_id  uuid references tasks(id) on delete set null,
  -- Auto-rollover
  auto_rollover   boolean not null default true,
  -- Completion
  completed_by    uuid references profiles(id),
  completed_at    timestamptz,
  completion_notes text,
  -- Created by
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Task assignees (many-to-many)
create table task_assignees (
  task_id    uuid not null references tasks(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references profiles(id),
  primary key (task_id, user_id)
);

-- Task file attachments
create table task_attachments (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid not null references tasks(id) on delete cascade,
  file_name   text not null,
  file_url    text not null,
  file_size   integer,
  mime_type   text,
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now()
);

-- Add foreign key for calendar_events.task_id now that tasks exists
-- (tasks table referenced before it was defined — handled by order above)

-- ============================================================
-- TIMESHEETS
-- ============================================================

create table timesheet_periods (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  is_locked    boolean not null default false,
  locked_by    uuid references profiles(id),
  locked_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, period_start)
);

create table timesheet_entries (
  id              uuid primary key default uuid_generate_v4(),
  period_id       uuid not null references timesheet_periods(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  work_date       date not null,
  start_time      time not null default '08:00',
  end_time        time not null default '17:00',
  break_minutes   integer not null default 0,
  notes           text,
  customer_id     uuid references customers(id) on delete set null,  -- reserved for phase 2
  location_id     uuid references locations(id) on delete set null,  -- reserved for phase 2
  is_auto_populated boolean not null default true,
  edited_by       uuid references profiles(id),
  edited_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (period_id, work_date)
);

-- ============================================================
-- MILEAGE CLAIMS
-- ============================================================

create table mileage_claims (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  claim_date        date not null,
  from_location     text not null,
  to_location       text not null,
  business_reason   text not null,
  distance_miles    numeric(8,2) not null,
  vehicle_reg       text,
  rate_per_mile     numeric(6,4) not null,
  calculated_amount numeric(10,2) not null,
  notes             text,
  attachment_url    text,
  status            expense_status not null default 'draft',
  submitted_at      timestamptz,
  approved_by       uuid references profiles(id),
  approved_at       timestamptz,
  paid_at           timestamptz,
  marked_paid_by    uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- EXPENSES
-- ============================================================

create table expenses (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  claim_date      date not null,
  category        expense_category not null,
  description     text not null,
  amount          numeric(10,2) not null,
  currency        text not null default 'GBP',
  receipt_url     text,
  notes           text,
  status          expense_status not null default 'draft',
  submitted_at    timestamptz,
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  rejection_reason text,
  paid_at         timestamptz,
  marked_paid_by  uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  type            notification_type not null,
  title           text not null,
  body            text,
  link            text,  -- relative URL to navigate to
  is_read         boolean not null default false,
  read_at         timestamptz,
  related_user_id uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- User notification preferences
create table notification_preferences (
  user_id                   uuid primary key references profiles(id) on delete cascade,
  holiday_submitted         boolean not null default true,
  holiday_approved          boolean not null default true,
  holiday_rejected          boolean not null default true,
  holiday_changed           boolean not null default true,
  expense_submitted         boolean not null default true,
  expense_approved          boolean not null default true,
  expense_rejected          boolean not null default true,
  task_assigned             boolean not null default true,
  task_changed              boolean not null default true,
  task_overdue              boolean not null default true,
  schedule_changed          boolean not null default true,
  timesheet_reminder        boolean not null default true,
  updated_at                timestamptz not null default now()
);

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================

create table company_settings (
  id                    uuid primary key default uuid_generate_v4(),
  key                   text not null unique,
  value                 text not null,
  description           text,
  updated_by            uuid references profiles(id),
  updated_at            timestamptz not null default now()
);

-- Default settings
insert into company_settings (key, value, description) values
  ('mileage_rate_per_mile', '0.45', 'Personal vehicle mileage reimbursement rate in GBP per mile'),
  ('default_holiday_allowance', '20', 'Default annual holiday allowance in days'),
  ('leave_year_start_month', '4', 'Month that the leave year starts (4 = April)'),
  ('default_start_time', '08:00', 'Default timesheet start time'),
  ('default_end_time', '17:00', 'Default timesheet end time'),
  ('default_weekly_hours', '45', 'Default contracted weekly hours'),
  ('company_name', 'Autonomous Agri Solutions Ltd', 'Company display name'),
  ('statutory_minimum_days', '20', 'Statutory minimum holiday days (warn if allowance set below this)'),
  ('timesheet_period_weeks', '4', 'Length of timesheet period in weeks');

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(status);
create index idx_holidays_user_id on holidays(user_id);
create index idx_holidays_status on holidays(status);
create index idx_holidays_dates on holidays(start_date, end_date);
create index idx_holidays_leave_year on holidays(leave_year);
create index idx_sickness_user_id on sickness_records(user_id);
create index idx_sickness_dates on sickness_records(start_date, end_date);
create index idx_calendar_events_user_id on calendar_events(user_id);
create index idx_calendar_events_dates on calendar_events(start_datetime, end_datetime);
create index idx_tasks_date on tasks(task_date);
create index idx_tasks_status on tasks(status);
create index idx_task_assignees_user on task_assignees(user_id);
create index idx_timesheet_entries_date on timesheet_entries(work_date);
create index idx_notifications_user on notifications(user_id, is_read);
create index idx_expenses_user on expenses(user_id, status);
create index idx_mileage_user on mileage_claims(user_id, status);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at          before update on profiles          for each row execute function set_updated_at();
create trigger trg_holidays_updated_at           before update on holidays           for each row execute function set_updated_at();
create trigger trg_sickness_updated_at           before update on sickness_records   for each row execute function set_updated_at();
create trigger trg_calendar_events_updated_at    before update on calendar_events    for each row execute function set_updated_at();
create trigger trg_tasks_updated_at              before update on tasks              for each row execute function set_updated_at();
create trigger trg_timesheet_entries_updated_at  before update on timesheet_entries  for each row execute function set_updated_at();
create trigger trg_expenses_updated_at           before update on expenses           for each row execute function set_updated_at();
create trigger trg_mileage_updated_at            before update on mileage_claims     for each row execute function set_updated_at();
create trigger trg_customers_updated_at          before update on customers          for each row execute function set_updated_at();
create trigger trg_locations_updated_at          before update on locations          for each row execute function set_updated_at();

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles                 enable row level security;
alter table working_patterns         enable row level security;
alter table holidays                 enable row level security;
alter table holiday_adjustments      enable row level security;
alter table sickness_records         enable row level security;
alter table customers                enable row level security;
alter table locations                enable row level security;
alter table vehicles                 enable row level security;
alter table equipment                enable row level security;
alter table calendar_events          enable row level security;
alter table tasks                    enable row level security;
alter table task_assignees           enable row level security;
alter table task_attachments         enable row level security;
alter table timesheet_periods        enable row level security;
alter table timesheet_entries        enable row level security;
alter table mileage_claims           enable row level security;
alter table expenses                 enable row level security;
alter table notifications            enable row level security;
alter table notification_preferences enable row level security;
alter table company_settings         enable row level security;
alter table bank_holidays            enable row level security;

-- Helper function: get current user's role
create or replace function auth_role()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

-- Helper function: is current user admin or manager?
create or replace function is_manager_or_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('administrator', 'manager')
    and status = 'active'
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'administrator'
    and status = 'active'
  );
$$;

-- PROFILES
create policy "Users can read all active profiles" on profiles
  for select using (status = 'active' or id = auth.uid());

create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());

create policy "Admins can manage all profiles" on profiles
  for all using (is_admin());

-- WORKING PATTERNS
create policy "Users can view own working patterns" on working_patterns
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Admins can manage working patterns" on working_patterns
  for all using (is_admin());

-- BANK HOLIDAYS
create policy "All authenticated users can view bank holidays" on bank_holidays
  for select using (auth.uid() is not null);

create policy "Admins can manage bank holidays" on bank_holidays
  for all using (is_admin());

-- HOLIDAYS
create policy "Users can view own holidays; managers see all" on holidays
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Users can insert own holidays; managers insert for others" on holidays
  for insert with check (user_id = auth.uid() or is_manager_or_admin());

create policy "Managers can update any holiday" on holidays
  for update using (is_manager_or_admin());

create policy "Users can update own pending holidays" on holidays
  for update using (user_id = auth.uid() and status = 'pending');

-- HOLIDAY ADJUSTMENTS
create policy "Admins manage holiday adjustments" on holiday_adjustments
  for all using (is_admin());

create policy "Users can view own adjustments" on holiday_adjustments
  for select using (user_id = auth.uid());

-- SICKNESS RECORDS
create policy "Managers see all sickness; employees see own" on sickness_records
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Employees can insert own sickness" on sickness_records
  for insert with check (user_id = auth.uid() or is_manager_or_admin());

create policy "Managers can update sickness" on sickness_records
  for update using (is_manager_or_admin());

create policy "Employees can update own sickness" on sickness_records
  for update using (user_id = auth.uid());

-- CUSTOMERS & LOCATIONS
create policy "All active users can view customers" on customers
  for select using (auth.uid() is not null);

create policy "Managers can manage customers" on customers
  for all using (is_manager_or_admin());

create policy "All active users can view locations" on locations
  for select using (auth.uid() is not null);

create policy "Managers can manage locations" on locations
  for all using (is_manager_or_admin());

-- VEHICLES & EQUIPMENT
create policy "All users can view vehicles" on vehicles
  for select using (auth.uid() is not null);

create policy "Managers can manage vehicles" on vehicles
  for all using (is_manager_or_admin());

create policy "All users can view equipment" on equipment
  for select using (auth.uid() is not null);

create policy "Managers can manage equipment" on equipment
  for all using (is_manager_or_admin());

-- CALENDAR EVENTS
create policy "Users see own events; managers see all" on calendar_events
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Managers can create events for anyone" on calendar_events
  for insert with check (is_manager_or_admin() or user_id = auth.uid());

create policy "Managers can update any event" on calendar_events
  for update using (is_manager_or_admin());

create policy "Users can update own future events" on calendar_events
  for update using (user_id = auth.uid() and start_datetime > now());

-- TASKS
create policy "All users see tasks assigned to them or created by them" on tasks
  for select using (
    created_by = auth.uid()
    or exists (select 1 from task_assignees where task_id = tasks.id and user_id = auth.uid())
    or is_manager_or_admin()
  );

create policy "All users can create tasks" on tasks
  for insert with check (auth.uid() is not null);

create policy "Managers can update any task" on tasks
  for update using (is_manager_or_admin());

create policy "Users can update assigned tasks" on tasks
  for update using (
    created_by = auth.uid()
    or exists (select 1 from task_assignees where task_id = tasks.id and user_id = auth.uid())
  );

create policy "Task assignees visible to task participants" on task_assignees
  for select using (
    user_id = auth.uid() or is_manager_or_admin()
    or exists (
      select 1 from tasks t
      where t.id = task_id and (
        t.created_by = auth.uid()
        or exists (select 1 from task_assignees ta2 where ta2.task_id = t.id and ta2.user_id = auth.uid())
      )
    )
  );

create policy "Users can assign tasks they create; managers assign any" on task_assignees
  for insert with check (
    is_manager_or_admin()
    or exists (select 1 from tasks where id = task_id and created_by = auth.uid())
  );

-- TIMESHEETS
create policy "Users see own timesheets; managers see all" on timesheet_periods
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Users see own entries; managers see all" on timesheet_entries
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Users can insert own entries if period not locked" on timesheet_entries
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from timesheet_periods
      where id = period_id and user_id = auth.uid() and not is_locked
    )
  );

create policy "Users can update own unlocked entries" on timesheet_entries
  for update using (
    user_id = auth.uid()
    and exists (
      select 1 from timesheet_periods
      where id = period_id and user_id = auth.uid() and not is_locked
    )
  );

create policy "Managers can update any entry" on timesheet_entries
  for update using (is_manager_or_admin());

-- EXPENSES & MILEAGE
create policy "Users see own expenses; managers see all" on expenses
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Users can insert own expenses" on expenses
  for insert with check (user_id = auth.uid());

create policy "Users can update own draft/rejected expenses" on expenses
  for update using (user_id = auth.uid() and status in ('draft', 'rejected'));

create policy "Managers can update expenses" on expenses
  for update using (is_manager_or_admin());

create policy "Users see own mileage; managers see all" on mileage_claims
  for select using (user_id = auth.uid() or is_manager_or_admin());

create policy "Users can insert own mileage" on mileage_claims
  for insert with check (user_id = auth.uid());

create policy "Users can update own draft/rejected mileage" on mileage_claims
  for update using (user_id = auth.uid() and status in ('draft', 'rejected'));

create policy "Managers can update mileage" on mileage_claims
  for update using (is_manager_or_admin());

-- NOTIFICATIONS
create policy "Users see own notifications" on notifications
  for select using (user_id = auth.uid());

create policy "Users can mark own notifications read" on notifications
  for update using (user_id = auth.uid());

create policy "System can insert notifications" on notifications
  for insert with check (true);  -- restricted by service role in practice

create policy "Users see own preferences" on notification_preferences
  for select using (user_id = auth.uid());

create policy "Users can update own preferences" on notification_preferences
  for all using (user_id = auth.uid());

-- COMPANY SETTINGS
create policy "All active users can read settings" on company_settings
  for select using (auth.uid() is not null);

create policy "Admins can update settings" on company_settings
  for update using (is_admin());

-- ============================================================
-- TRIGGER: auto-create profile on new user
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, status, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'pending',
    'employee'
  );
  insert into notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TRIGGER: auto-create working pattern for new profile
-- ============================================================

create or replace function handle_new_profile()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'active' then
    insert into working_patterns (user_id, mon, tue, wed, thu, fri, sat, sun)
    values (new.id, true, true, true, true, true, false, false)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_profile_activated
  after update on profiles
  for each row
  when (old.status <> 'active' and new.status = 'active')
  execute function handle_new_profile();

-- ============================================================
-- FUNCTION: calculate working days between two dates for a user
-- (excludes bank holidays and days not in their working pattern)
-- ============================================================

create or replace function calculate_working_days(
  p_user_id   uuid,
  p_start     date,
  p_end       date
) returns integer language plpgsql stable security definer as $$
declare
  v_days    integer := 0;
  v_date    date := p_start;
  v_dow     integer;
  v_pattern working_patterns%rowtype;
begin
  -- Get current working pattern
  select * into v_pattern
  from working_patterns
  where user_id = p_user_id and is_current = true
  limit 1;

  -- Default Mon-Fri if no pattern found
  if not found then
    while v_date <= p_end loop
      v_dow := extract(dow from v_date);  -- 0=Sun, 1=Mon...6=Sat
      if v_dow between 1 and 5 then
        -- check bank holiday
        if not exists (select 1 from bank_holidays where date = v_date) then
          v_days := v_days + 1;
        end if;
      end if;
      v_date := v_date + interval '1 day';
    end loop;
  else
    while v_date <= p_end loop
      v_dow := extract(dow from v_date);
      if (v_dow = 1 and v_pattern.mon) or
         (v_dow = 2 and v_pattern.tue) or
         (v_dow = 3 and v_pattern.wed) or
         (v_dow = 4 and v_pattern.thu) or
         (v_dow = 5 and v_pattern.fri) or
         (v_dow = 6 and v_pattern.sat) or
         (v_dow = 0 and v_pattern.sun) then
        if not exists (select 1 from bank_holidays where date = v_date) then
          v_days := v_days + 1;
        end if;
      end if;
      v_date := v_date + interval '1 day';
    end loop;
  end if;

  return v_days;
end;
$$;

-- ============================================================
-- FUNCTION: get holiday balance for a user and leave year
-- ============================================================

create or replace function get_holiday_balance(
  p_user_id    uuid,
  p_leave_year integer
) returns table (
  allowance    integer,
  adjustments  integer,
  used         integer,
  pending      integer,
  remaining    integer
) language plpgsql stable security definer as $$
declare
  v_allowance  integer;
  v_adjust     integer;
  v_used       integer;
  v_pending    integer;
begin
  select holiday_allowance into v_allowance from profiles where id = p_user_id;
  v_allowance := coalesce(v_allowance, 20);

  select coalesce(sum(days), 0) into v_adjust
  from holiday_adjustments
  where user_id = p_user_id and leave_year = p_leave_year;

  select coalesce(sum(working_days), 0) into v_used
  from holidays
  where user_id = p_user_id and leave_year = p_leave_year and status = 'approved';

  select coalesce(sum(working_days), 0) into v_pending
  from holidays
  where user_id = p_user_id and leave_year = p_leave_year and status = 'pending';

  return query select
    v_allowance,
    v_adjust,
    v_used,
    v_pending,
    (v_allowance + v_adjust - v_used);
end;
$$;
