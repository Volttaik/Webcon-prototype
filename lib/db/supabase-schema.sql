create table if not exists users (
  id serial primary key,
  email text not null unique,
  password_hash text not null,
  first_name text not null default '',
  last_name text not null default '',
  institution text,
  email_verified boolean not null default false,
  email_verify_token text,
  created_at text not null default now()::text
);

create table if not exists sessions (
  id text primary key,
  user_id integer not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default now()::text
);

create table if not exists learning_hubs (
  id serial primary key,
  creator_id integer not null references users(id) on delete cascade,
  title text not null,
  description text,
  domain text not null default 'general',
  access_cost integer not null default 200,
  agent_cost integer not null default 700,
  is_public boolean not null default true,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists hub_files (
  id serial primary key,
  hub_id integer not null references learning_hubs(id) on delete cascade,
  title text not null,
  content text not null,
  file_type text not null default 'text',
  created_at text not null default now()::text
);

create table if not exists agents (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  name text not null,
  subject text not null,
  level text not null,
  tone text not null default 'patient',
  domain text not null default 'general',
  personality_description text,
  soul_md text,
  system_prompt text,
  learning_hub_id integer,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists agent_memory (
  id serial primary key,
  agent_id integer not null references agents(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  memory_type text not null default 'long_term',
  content text not null,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists agent_subscriptions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  agent_id integer not null references agents(id) on delete cascade,
  credits_cost integer not null default 100,
  expires_at text not null,
  active boolean not null default true,
  created_at text not null default now()::text
);

create table if not exists conversations (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  agent_id integer references agents(id) on delete set null,
  title text not null,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists messages (
  id serial primary key,
  conversation_id integer not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  verb text,
  think_ms integer,
  created_at text not null default now()::text
);

create table if not exists credit_balances (
  user_id integer primary key references users(id) on delete cascade,
  balance integer not null default 0,
  updated_at text not null default now()::text
);

create table if not exists credit_transactions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  amount integer not null,
  type text not null,
  description text not null,
  reference text,
  created_at text not null default now()::text
);

create table if not exists workspace_items (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  agent_id integer references agents(id) on delete set null,
  conversation_id integer,
  type text not null,
  title text not null,
  content text not null default '',
  pinned boolean not null default false,
  starred boolean not null default false,
  subject text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists schedule_sessions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  agent_id integer references agents(id) on delete set null,
  title text not null,
  subject text,
  date text not null,
  duration integer not null default 60,
  type text not null default 'study',
  completed boolean not null default false,
  notes text,
  created_at text not null default now()::text
);

create table if not exists projects (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  agent_id integer references agents(id) on delete set null,
  title text not null,
  subject text,
  type text not null default 'general',
  status text not null default 'active',
  due_date text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists project_tasks (
  id serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  due_date text,
  created_at text not null default now()::text
);

create table if not exists whatsapp_links (
  user_id integer primary key references users(id) on delete cascade,
  init_code text not null unique,
  connected boolean not null default false,
  phone_number text,
  connected_at text,
  created_at text not null default now()::text
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists agents_user_id_idx on agents(user_id);
create index if not exists conversations_user_id_idx on conversations(user_id);
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists credit_transactions_user_id_idx on credit_transactions(user_id);
create index if not exists workspace_items_user_id_idx on workspace_items(user_id);
create index if not exists schedule_sessions_user_id_idx on schedule_sessions(user_id);
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists project_tasks_project_id_idx on project_tasks(project_id);
