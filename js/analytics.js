/**
 * Dual tracking: GA4 (gtag) + Vercel Web Analytics (window.va).
 * Safe no-ops when either SDK is missing.
 */

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
}
