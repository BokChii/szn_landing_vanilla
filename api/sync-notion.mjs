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

function getKstRegistrationFields(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid created_at: ${isoString}`);
    }

    const dateParts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = dateParts.find((part) => part.type === 'year')?.value;
    const month = dateParts.find((part) => part.type === 'month')?.value;
    const day = dateParts.find((part) => part.type === 'day')?.value;

    const timeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const hour = timeParts.find((part) => part.type === 'hour')?.value;
    const minute = timeParts.find((part) => part.type === 'minute')?.value;
    const second = timeParts.find((part) => part.type === 'second')?.value;

    return {
        dateLabel: `${month}.${day}`,
        registeredAt: `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`,
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

async function createNotionRegistrationRow({
    databaseId,
    notionToken,
    dateLabel,
    email,
    registeredAt,
}) {
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${notionToken}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parent: {
                database_id: databaseId,
            },
            properties: {
                일시: {
                    title: [{ text: { content: dateLabel } }],
                },
                '등록(Email)': {
                    email,
                },
                등록일시: {
                    date: {
                        start: registeredAt,
                    },
                },
            },
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Notion create failed (${response.status}): ${body}`);
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
    const email = (record.email || '').trim();

    if (!createdAt) {
        return res.status(400).json({ error: 'Missing record.created_at' });
    }

    if (!email) {
        return res.status(400).json({ error: 'Missing record.email' });
    }

    try {
        const { dateLabel, registeredAt } = getKstRegistrationFields(createdAt);
        const page = await createNotionRegistrationRow({
            databaseId,
            notionToken,
            dateLabel,
            email,
            registeredAt,
        });

        return res.status(200).json({
            ok: true,
            dateLabel,
            email,
            pageId: page.id,
        });
    } catch (error) {
        console.error('[sync-notion]', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Sync failed',
        });
    }
}
