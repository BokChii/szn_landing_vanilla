-- 기존 quiz_events 테이블에 session_id 추가 (이미 테이블이 있는 프로젝트용)

alter table public.quiz_events
  add column if not exists session_id uuid;

create index if not exists quiz_events_session_id_idx
  on public.quiz_events (session_id);

-- 참여 수 예시 (완료 기준)
-- select count(distinct session_id)
-- from public.quiz_events
-- where event = 'quiz_complete' and session_id is not null;
