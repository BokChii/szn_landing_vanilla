-- 결과 카드 저장/공유 로그(quiz_card_save)를 허용 (Supabase SQL Editor에서 실행)
-- quiz_events.event 에 걸린 CHECK 제약을 교체한다. 실행 전에는 해당 insert가 거부된다.

alter table public.quiz_events
  drop constraint if exists quiz_events_event_check;

alter table public.quiz_events
  add constraint quiz_events_event_check
  check (event in ('quiz_open', 'quiz_start', 'quiz_complete', 'quiz_share', 'quiz_card_save'));

-- 카드 저장 전환율 예시 (완료 대비 카드 저장)
-- select
--   count(distinct session_id) filter (where event = 'quiz_complete') as completed,
--   count(distinct session_id) filter (where event = 'quiz_card_save') as card_saved
-- from public.quiz_events;
