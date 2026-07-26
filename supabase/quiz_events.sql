-- 성향 테스트 참여 로그 (Supabase SQL Editor에서 실행)
-- 프론트(anon)는 INSERT만 가능. 조회는 Dashboard / service role로.
-- 이미 테이블을 만든 경우: quiz_events_add_session_id.sql 만 실행하세요.

create table if not exists public.quiz_events (
  id bigint generated always as identity primary key,
  session_id uuid,
  event text not null,
  source text,
  genre text,
  created_at timestamptz not null default now(),
  constraint quiz_events_event_check
    check (event in ('quiz_open', 'quiz_start', 'quiz_complete', 'quiz_share'))
);

create index if not exists quiz_events_created_at_idx
  on public.quiz_events (created_at desc);

create index if not exists quiz_events_event_idx
  on public.quiz_events (event);

create index if not exists quiz_events_session_id_idx
  on public.quiz_events (session_id);

alter table public.quiz_events enable row level security;

drop policy if exists "anon insert quiz_events" on public.quiz_events;
create policy "anon insert quiz_events"
  on public.quiz_events
  for insert
  to anon
  with check (true);

-- 참고: SELECT 정책은 두지 않음 (anon이 전체 로그를 읽지 못함)

-- 참여 수 예시 (완료 기준 unique session)
-- select count(distinct session_id)
-- from public.quiz_events
-- where event = 'quiz_complete' and session_id is not null;
