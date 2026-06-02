-- Supabase SQL Schema for UPCARS v2

-- Vehicle state change events (audit log)
create table if not exists vehicle_events (
  id bigint generated always as identity primary key,
  vehicle_id text not null,
  vehicle_name text not null,
  old_state text,
  new_state text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicle_events_vehicle_id on vehicle_events(vehicle_id);
create index if not exists idx_vehicle_events_created_at on vehicle_events(created_at desc);

-- SLA tracking records
create table if not exists sla_records (
  id bigint generated always as identity primary key,
  vehicle_id text not null,
  area text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  threshold float not null,
  met boolean,
  created_at timestamptz not null default now()
);

create index if not exists idx_sla_records_vehicle_id on sla_records(vehicle_id);
create index if not exists idx_sla_records_area on sla_records(area);
create index if not exists idx_sla_records_open on sla_records(end_time) where end_time is null;

-- Alert records
create table if not exists alert_records (
  id bigint generated always as identity primary key,
  vehicle_id text,
  vehicle_name text not null,
  type text not null,
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_alert_records_resolved on alert_records(resolved);
create index if not exists idx_alert_records_type on alert_records(type);
create index if not exists idx_alert_records_vehicle_id on alert_records(vehicle_id);
