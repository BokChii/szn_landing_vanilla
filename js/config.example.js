/**
 * Copy this file to config.js and fill in your project values.
 * (Supabase: Settings → API / GA4: Admin → Data streams → Measurement ID)
 */
export const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
export const PREORDER_TABLE = 'pre_registrations';
/** Quiz funnel log table (see supabase/quiz_events.sql) */
export const QUIZ_EVENTS_TABLE = 'quiz_events';
/** Landing share button clicks (see supabase/share_events.sql) */
export const SHARE_EVENTS_TABLE = 'share_events';
/** Optional. Example: 'G-XXXXXXXXXX' — leave '' to skip GA */
export const GA_MEASUREMENT_ID = '';
