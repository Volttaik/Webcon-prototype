-- Migration v2: Learning Hub, Image Support, Creator Earnings

-- Add new columns to users
alter table users add column if not exists avatar_url text;
alter table users add column if not exists is_banned boolean not null default false;
alter table users add column if not exists ban_reason text;
alter table users add column if not exists paystack_recipient_code text;

-- Add image_url to messages
alter table messages add column if not exists image_url text;

-- Update learning_hubs with new columns
alter table learning_hubs add column if not exists status text not null default 'active';
alter table learning_hubs add column if not exists access_token text;
alter table learning_hubs add column if not exists subscriber_count integer not null default 0;

-- Update costs: hub subscription = 50 credits, agent from hub = 200 credits
-- (existing rows keep old values, new defaults apply to new rows)

-- Hub applications table
create table if not exists hub_applications (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  full_name text not null,
  gender text not null,
  date_of_birth text not null,
  gmail_address text not null,
  state text not null,
  university text not null,
  degree_status text not null,
  nin text not null,
  field_of_study text not null,
  expertise_level text not null,
  target_level text not null,
  hub_title text not null,
  hub_description text,
  hub_domain text not null default 'general',
  passport_photo_url text,
  degree_evidence_url text,
  student_evidence_url text,
  status text not null default 'pending',
  hub_id integer references learning_hubs(id),
  created_at text not null default now()::text,
  reviewed_at text
);

-- Hub subscriptions
create table if not exists hub_subscriptions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  hub_id integer not null references learning_hubs(id) on delete cascade,
  active boolean not null default true,
  created_at text not null default now()::text
);

-- Creator earnings ledger
create table if not exists creator_earnings (
  id serial primary key,
  creator_id integer not null references users(id) on delete cascade,
  hub_id integer references learning_hubs(id),
  type text not null,
  amount_ngn integer not null,
  description text not null,
  paystack_reference text,
  transfer_status text not null default 'pending',
  created_at text not null default now()::text
);

-- Indexes
create index if not exists hub_applications_user_id_idx on hub_applications(user_id);
create index if not exists hub_subscriptions_user_id_idx on hub_subscriptions(user_id);
create index if not exists hub_subscriptions_hub_id_idx on hub_subscriptions(hub_id);
create index if not exists creator_earnings_creator_id_idx on creator_earnings(creator_id);
