-- 랜딩 공유 버튼 클릭 로그 (Supabase SQL Editor에서 실행)
-- 프론트(anon)는 INSERT만 가능.

create table if not exists public.share_events (
  id bigint generated always as identity primary key,
  source text not null default 'preorder',
  created_at timestamptz not null default now(),
  constraint share_events_source_check
    check (source in ('preorder'))
);

create index if not exists share_events_created_at_idx
  on public.share_events (created_at desc);

create index if not exists share_events_source_idx
  on public.share_events (source);

alter table public.share_events enable row level security;

drop policy if exists "anon insert share_events" on public.share_events;
create policy "anon insert share_events"
  on public.share_events
  for insert
  to anon
  with check (true);

-- 클릭 수 예시
-- select count(*) from public.share_events where source = 'preorder';
