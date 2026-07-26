/**
 * Dual tracking: GA4 (gtag) + Vercel Web Analytics (window.va).
 * Quiz funnel events are also persisted to Supabase when configured.
 */

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let quizLogClient = null;
let quizLogTable = 'quiz_events';

const QUIZ_EVENTS = new Set(['quiz_open', 'quiz_start', 'quiz_complete', 'quiz_share']);

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
 * @param {{ supabase?: import('@supabase/supabase-js').SupabaseClient | null, table?: string }} options
 */
export function initQuizLog(options = {}) {
    quizLogClient = options.supabase || null;
    if (options.table) quizLogTable = options.table;
}

/**
 * @param {string} name Event name (e.g. quiz_open)
 * @param {Record<string, string | number | boolean>} [params]
 */
export function trackEvent(name, params = {}) {
    if (!name) return;

    try {
        if (typeof window.va === 'function') {
            window.va('event', { name, data: params });
        }
    } catch {
        /* ignore */
    }

    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, params);
        }
    } catch {
        /* ignore */
    }

    if (QUIZ_EVENTS.has(name)) {
        void persistQuizEvent(name, params);
    }
}

/**
 * @param {string} name
 * @param {Record<string, string | number | boolean>} params
 */
async function persistQuizEvent(name, params) {
    if (!quizLogClient) return;

    const row = {
        event: name,
        source: typeof params.source === 'string' ? params.source : null,
        genre: typeof params.genre === 'string' ? params.genre : null,
    };

    try {
        const { error } = await quizLogClient.from(quizLogTable).insert(row);
        if (error) console.warn('[quiz_events]', error.message || error);
    } catch (e) {
        console.warn('[quiz_events]', e);
    }
}
