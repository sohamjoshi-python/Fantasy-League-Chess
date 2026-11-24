-- Home-screen push subscriptions for the Monday lineup reminder.
-- The browser endpoint is unique per device. Signing in on that device
-- moves the subscription to the current user.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "users manage their own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.push_reminder_sends (
  kind text not null,
  sent_on date not null,
  sent_count integer not null default 0,
  primary key (kind, sent_on)
);

alter table public.push_reminder_sends enable row level security;
