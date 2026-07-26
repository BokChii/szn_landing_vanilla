/**
 * Dual tracking: GA4 (gtag) + Vercel Web Analytics (window.va).
 * Quiz / share funnel events are also persisted to Supabase when configured.
 */

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let logClient = null;
let quizLogTable = 'quiz_events';
let shareLogTable = 'share_events';
/** Anonymous id for one quiz attempt (open → complete/share). */
let quizSessionId = '';

const QUIZ_EVENTS = new Set(['quiz_open', 'quiz_start', 'quiz_complete', 'quiz_share']);
const SHARE_EVENTS = new Set(['preorder_share']);

/**
 * @param {string} measurementId GA4 Measurement ID (G-XXXXXXXX)
 */
export function initGa(measurementId) {
    const id = (measurementId || '').trim();
    if (!id || !id.startsWith('G-')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
        window.gtag ||
        function gtag() {
            window.dataLayer.push(arguments);
        };

    window.gtag('js', new Date());
    window.gtag('config', id);

    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${id}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
}

/**
 * @param {{
 *   supabase?: import('@supabase/supabase-js').SupabaseClient | null,
 *   table?: string,
 *   shareTable?: string,
 * }} options
 */
export function initQuizLog(options = {}) {
    logClient = options.supabase || null;
    if (options.table) quizLogTable = options.table;
    if (options.shareTable) shareLogTable = options.shareTable;
}

function newSessionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/** Start a new quiz attempt; returns the session id. */
export function beginQuizSession() {
    quizSessionId = newSessionId();
    return quizSessionId;
}

/**
 * @param {string} name Event name (e.g. quiz_open, preorder_share)
 * @param {Record<string, string | number | boolean>} [params]
 */
export function trackEvent(name, params = {}) {
    if (!name) return;

    const payload = { ...params };
    if (QUIZ_EVENTS.has(name)) {
        if (!quizSessionId) beginQuizSession();
        payload.session_id = quizSessionId;
    }

    try {
        if (typeof window.va === 'function') {
            window.va('event', { name, data: payload });
        }
    } catch {
        /* ignore */
    }

    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, payload);
        }
    } catch {
        /* ignore */
    }

    if (QUIZ_EVENTS.has(name)) {
        void persistQuizEvent(name, payload);
    } else if (SHARE_EVENTS.has(name)) {
        void persistShareEvent(payload);
    }
}

/**
 * @param {string} name
 * @param {Record<string, string | number | boolean>} params
 */
async function persistQuizEvent(name, params) {
    if (!logClient) return;

    const row = {
        event: name,
        session_id: typeof params.session_id === 'string' ? params.session_id : null,
        source: typeof params.source === 'string' ? params.source : null,
        genre: typeof params.genre === 'string' ? params.genre : null,
    };

    try {
        const { error } = await logClient.from(quizLogTable).insert(row);
        if (error) console.warn('[quiz_events]', error.message || error);
    } catch (e) {
        console.warn('[quiz_events]', e);
    }
}

/**
 * @param {Record<string, string | number | boolean>} params
 */
async function persistShareEvent(params) {
    if (!logClient) return;

    const row = {
        source: typeof params.source === 'string' ? params.source : 'preorder',
    };

    try {
        const { error } = await logClient.from(shareLogTable).insert(row);
        if (error) console.warn('[share_events]', error.message || error);
    } catch (e) {
        console.warn('[share_events]', e);
    }
}
