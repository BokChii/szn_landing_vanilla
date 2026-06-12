const TIMEZONE = 'Asia/Seoul';
const NOTION_VERSION = '2022-06-28';

function readEnv(name) {
    return (process.env[name] || '').trim();
}

function parseDatabaseId(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    const compact = trimmed.replace(/-/g, '');
    if (/^[a-f0-9]{32}$/i.test(compact)) {
        return compact;
    }
    const match = trimmed.match(
        /([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
    );
    if (!match) return null;
    return match[1].replace(/-/g, '');
}

function getKstDateParts(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid created_at: ${isoString}`);
    }

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return { year, month, day, dateLabel: `${month}.${day}` };
}

function getKstDayBounds(isoString) {
    const { year, month, day, dateLabel } = getKstDateParts(isoString);
    const start = new Date(`${year}-${month}-${day}T00:00:00+09:00`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return {
        dateLabel,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
    };
}

function isAuthorized(req) {
    const secret = readEnv('SUPABASE_WEBHOOK_SECRET');
    if (!secret) return true;

    const authHeader = req.headers.authorization || '';
    const headerSecret = req.headers['x-webhook-secret'] || '';

    if (authHeader === `Bearer ${secret}`) return true;
    if (headerSecret === secret) return true;
    return false;
}

async function countRegistrationsForDay({ startIso, endIso, tableName }) {
    const supabaseUrl = readEnv('SUPABASE_URL');
    const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    const params = new URLSearchParams({
        select: 'id',
        created_at: `gte.${startIso}`,
    });
    params.append('created_at', `lt.${endIso}`);

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?${params.toString()}`, {
        method: 'GET',
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Prefer: 'count=exact',
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Supabase count failed (${response.status}): ${body}`);
    }

    const contentRange = response.headers.get('content-range') || '';
    const total = contentRange.split('/')[1];
    const count = Number.parseInt(total, 10);

    if (Number.isNaN(count)) {
        throw new Error(`Unexpected Supabase count response: ${contentRange}`);
    }

    return count;
}

async function findNotionPageByDate(databaseId, dateLabel, notionToken) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${notionToken}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            page_size: 1,
            filter: {
                property: '일시',
                title: {
                    equals: dateLabel,
                },
            },
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Notion query failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    return data.results?.[0] || null;
}

async function updateNotionRegistration(pageId, count, notionToken) {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${notionToken}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: {
                등록: {
                    number: count,
                },
            },
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Notion update failed (${response.status}): ${body}`);
    }

    return response.json();
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const notionToken = readEnv('NOTION_TOKEN');
    const databaseId = parseDatabaseId(
        readEnv('NOTION_DATABASE_ID') || readEnv('NOTION_DATABASE_URL'),
    );
    const tableName = readEnv('PREORDER_TABLE') || 'pre_registrations';

    if (!notionToken || !databaseId) {
        return res.status(500).json({
            error: 'NOTION_TOKEN and NOTION_DATABASE_ID are required',
        });
    }

    const payload = req.body || {};
    const eventType = payload.type;
    const eventTable = payload.table;

    if (eventType && eventType !== 'INSERT') {
        return res.status(200).json({ ok: true, skipped: true, reason: 'not_insert' });
    }

    if (eventTable && eventTable !== tableName) {
        return res.status(200).json({ ok: true, skipped: true, reason: 'table_mismatch' });
    }

    const record = payload.record || payload;
    const createdAt = record.created_at;

    if (!createdAt) {
        return res.status(400).json({ error: 'Missing record.created_at' });
    }

    try {
        const dayBounds = getKstDayBounds(createdAt);
        const count = await countRegistrationsForDay({
            ...dayBounds,
            tableName,
        });

        const page = await findNotionPageByDate(databaseId, dayBounds.dateLabel, notionToken);
        if (!page) {
            return res.status(404).json({
                error: `No Notion row found for 일시=${dayBounds.dateLabel}`,
                dateLabel: dayBounds.dateLabel,
                count,
            });
        }

        await updateNotionRegistration(page.id, count, notionToken);

        return res.status(200).json({
            ok: true,
            dateLabel: dayBounds.dateLabel,
            count,
            pageId: page.id,
        });
    } catch (error) {
        console.error('[sync-notion]', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Sync failed',
        });
    }
}
