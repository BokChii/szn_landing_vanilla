/**
 * 성향 테스트 결과를 인스타 스토리 규격(1080x1920) 카드 이미지로 렌더링한다.
 * 결과 화면과 같은 에셋·수치를 쓰므로 화면과 카드가 어긋나지 않는다.
 */

const CARD_W = 1080;
const CARD_H = 1920;

const PAD_X = 96;
const CONTENT_W = CARD_W - PAD_X * 2;

const FRAME_INSET = 26;
const FRAME_RADIUS = 48;

/** 인스타 UI(상단 프로필 / 하단 답장창)를 피하는 여백 */
const SAFE_TOP = 150;
const STRIP_TOP = 1600;
const STRIP_H = 76;

const PANEL_BOTTOM = 1500;
const PANEL_H = 410;
const PANEL_TOP = PANEL_BOTTOM - PANEL_H;
const PANEL_W = 620;
const PANEL_X = (CARD_W - PANEL_W) / 2;

const BADGE_TOP = 336;
const BADGE_H = 88;
const MASCOT_TOP = BADGE_TOP + BADGE_H + 40;
const MASCOT_SIZE = 400;

const COLORS = {
    black: '#000000',
    white: '#ffffff',
    cream: '#fffbeb',
    butter: '#fde68a',
    yellow: '#facc15',
    indigo: '#4f46e5',
    indigoDeep: '#312e81',
    indigoMid: '#4338ca',
    gray: '#6b7280',
    grayDark: '#374151',
};

const FONT = "'Noto Sans KR', sans-serif";

const STAT_ORDER = [
    { key: 'focus', label: '집중력' },
    { key: 'reasoning', label: '추리력' },
    { key: 'empathy', label: '공감력' },
    { key: 'reflex', label: '순발력' },
    { key: 'inner_power', label: '내공' },
];

/** @param {number} weight @param {number} size */
function font(weight, size) {
    return `${weight} ${size}px ${FONT}`;
}

/**
 * 카드에 쓰는 굵기를 미리 로드한다. 실패해도 시스템 폰트로 그려진다.
 */
async function ensureFonts() {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    const specs = [font(900, 100), font(800, 40), font(700, 30)];
    try {
        await Promise.all(specs.map((spec) => document.fonts.load(spec, '스토릿 결과')));
    } catch {
        /* 폰트 로드 실패는 무시 */
    }
}

/** @param {string} src @returns {Promise<HTMLImageElement>} */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`이미지를 불러오지 못했어: ${src}`));
        img.src = src;
    });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, radius);
        return;
    }
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

/**
 * 네오브루탈리즘 특유의 흐림 없는 오프셋 그림자 + 본체.
 * @param {CanvasRenderingContext2D} ctx
 */
function brutalBox(ctx, x, y, w, h, r, fill, offset = 10, border = 5) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    roundRectPath(ctx, x + offset, y + offset, w, h, r);
    ctx.fill();

    ctx.fillStyle = fill;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.lineWidth = border;
    ctx.strokeStyle = COLORS.black;
    ctx.stroke();
}

/**
 * 공백 우선으로 줄을 나누되, 한 덩어리가 너무 길면 글자 단위로 쪼갠다.
 * @param {CanvasRenderingContext2D} ctx
 * @returns {string[]}
 */
function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';

    const flush = () => {
        if (line) lines.push(line);
        line = '';
    };

    for (const word of String(text).split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
            line = candidate;
            continue;
        }
        flush();
        if (ctx.measureText(word).width <= maxWidth) {
            line = word;
            continue;
        }
        for (const ch of word) {
            const next = line + ch;
            if (ctx.measureText(next).width > maxWidth) flush();
            line += ch;
        }
    }
    flush();
    return lines;
}

/**
 * 2줄짜리 제목은 두 줄 길이가 비슷해지는 지점에서 끊는다.
 * (제목에 쉼표가 있으면 대개 그 자리가 선택된다.)
 * @param {CanvasRenderingContext2D} ctx
 * @returns {string[] | null}
 */
function balanceTwoLines(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;

    let best = null;
    for (let i = 1; i < words.length; i += 1) {
        const first = words.slice(0, i).join(' ');
        const second = words.slice(i).join(' ');
        const w1 = ctx.measureText(first).width;
        const w2 = ctx.measureText(second).width;
        if (w1 > maxWidth || w2 > maxWidth) continue;
        const diff = Math.abs(w1 - w2);
        if (!best || diff < best.diff) best = { diff, lines: [first, second] };
    }
    return best ? best.lines : null;
}

/**
 * 2줄 안에 들어가는 가장 큰 글자 크기를 고른다.
 * @param {CanvasRenderingContext2D} ctx
 */
function fitTitle(ctx, text, maxWidth) {
    for (const size of [56, 50, 44]) {
        ctx.font = font(900, size);
        const lines = wrapText(ctx, text, maxWidth);
        if (lines.length === 1) return { size, lines };
        if (lines.length === 2) return { size, lines: balanceTwoLines(ctx, text, maxWidth) || lines };
    }
    ctx.font = font(900, 44);
    return { size: 44, lines: wrapText(ctx, text, maxWidth) };
}

/** @param {CanvasRenderingContext2D} ctx */
function drawBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    grad.addColorStop(0, COLORS.cream);
    grad.addColorStop(1, COLORS.butter);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.lineWidth = 6;
    ctx.strokeStyle = COLORS.indigo;
    roundRectPath(
        ctx,
        FRAME_INSET,
        FRAME_INSET,
        CARD_W - FRAME_INSET * 2,
        CARD_H - FRAME_INSET * 2,
        FRAME_RADIUS,
    );
    ctx.stroke();
}

/**
 * 쿠키 아이콘 + 워드마크 + 캡션.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement | null} cookie
 */
function drawHeader(ctx, cookie) {
    const markSize = 92;
    const gap = 20;
    const wordmark = '스토릿';

    ctx.font = font(900, 68);
    const wordWidth = ctx.measureText(wordmark).width;
    const rowWidth = (cookie ? markSize + gap : 0) + wordWidth;
    let x = (CARD_W - rowWidth) / 2;
    const rowCenterY = SAFE_TOP + markSize / 2;

    if (cookie) {
        const ratio = cookie.naturalWidth / cookie.naturalHeight || 1;
        const h = markSize;
        const w = h * ratio;
        ctx.drawImage(cookie, x - (w - markSize) / 2, SAFE_TOP, w, h);
        x += markSize + gap;
    }

    ctx.fillStyle = COLORS.black;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(wordmark, x, rowCenterY + 2);

    ctx.font = font(700, 30);
    ctx.fillStyle = COLORS.gray;
    ctx.textAlign = 'center';
    ctx.fillText('웹툰 성향 테스트 결과', CARD_W / 2, SAFE_TOP + markSize + 32);
}

/** @param {CanvasRenderingContext2D} ctx */
function drawBadge(ctx, label) {
    ctx.font = font(900, 46);
    const w = Math.max(240, ctx.measureText(label).width + 96);
    const x = (CARD_W - w) / 2;

    brutalBox(ctx, x, BADGE_TOP, w, BADGE_H, BADGE_H / 2, COLORS.yellow, 10, 5);

    ctx.fillStyle = COLORS.black;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, CARD_W / 2, BADGE_TOP + BADGE_H / 2 + 3);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement | null} mascot
 */
function drawMascot(ctx, mascot) {
    const x = (CARD_W - MASCOT_SIZE) / 2;
    const top = MASCOT_TOP;
    brutalBox(ctx, x, top, MASCOT_SIZE, MASCOT_SIZE, 40, COLORS.white, 12, 5);
    if (!mascot) return;

    ctx.save();
    roundRectPath(ctx, x, top, MASCOT_SIZE, MASCOT_SIZE, 40);
    ctx.clip();

    const ratio = mascot.naturalWidth / mascot.naturalHeight || 1;
    let w = MASCOT_SIZE;
    let h = MASCOT_SIZE;
    if (ratio > 1) w = MASCOT_SIZE * ratio;
    else h = MASCOT_SIZE / ratio;
    ctx.drawImage(mascot, x + (MASCOT_SIZE - w) / 2, top + (MASCOT_SIZE - h) / 2, w, h);
    ctx.restore();
}

/**
 * 마스코트와 능력치 패널 사이 남는 공간에 제목/부제를 세로 중앙 정렬한다.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawTitleBlock(ctx, result) {
    const zoneTop = MASCOT_TOP + MASCOT_SIZE;
    const zoneBottom = PANEL_TOP;
    // 본문보다 좁게 줄바꿈해 제목이 카드 폭에 꽉 차 보이지 않게 한다.
    const { size, lines } = fitTitle(ctx, result.title, CONTENT_W - 140);
    const lineHeight = size + 18;
    const subSize = 34;
    const subGap = 16;

    const blockH = lines.length * lineHeight + subGap + subSize;
    let y = zoneTop + (zoneBottom - zoneTop - blockH) / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.indigoDeep;
    ctx.font = font(900, size);
    for (const line of lines) {
        ctx.fillText(line, CARD_W / 2, y);
        y += lineHeight;
    }

    ctx.font = font(800, subSize);
    ctx.fillStyle = COLORS.indigoMid;
    ctx.fillText(result.sub_title, CARD_W / 2, y + subGap);
}

/**
 * 결과 화면 SVG 레이더와 같은 좌표 계산을 사용한다.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawStatsPanel(ctx, stats) {
    brutalBox(ctx, PANEL_X, PANEL_TOP, PANEL_W, PANEL_H, 32, COLORS.white, 12, 5);

    ctx.font = font(800, 32);
    ctx.fillStyle = COLORS.grayDark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('능력치 프로필', CARD_W / 2, PANEL_TOP + 26);

    const chartTop = PANEL_TOP + 74;
    const chartBottom = PANEL_BOTTOM - 28;
    const labelGap = 38;
    const cx = CARD_W / 2;
    const cy = (chartTop + chartBottom) / 2;
    const rMax = (chartBottom - chartTop) / 2 - labelGap - 13;
    const n = STAT_ORDER.length;
    const values = STAT_ORDER.map(({ key }) => Math.min(100, Math.max(0, stats?.[key] ?? 0)));

    const pt = (i, radius) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    };

    const polygon = (radiusAt) => {
        ctx.beginPath();
        values.forEach((v, i) => {
            const [px, py] = pt(i, radiusAt(v, i));
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.closePath();
    };

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.18)';
    for (const level of [0.35, 0.65, 1]) {
        polygon(() => rMax * level);
        ctx.stroke();
    }

    polygon((v) => rMax * (v / 100));
    ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.indigo;
    ctx.stroke();

    ctx.font = font(800, 26);
    ctx.fillStyle = COLORS.gray;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    STAT_ORDER.forEach((s, i) => {
        const [lx, ly] = pt(i, rMax + labelGap);
        ctx.fillText(s.label, lx, ly);
    });
}

/** @param {CanvasRenderingContext2D} ctx */
function drawLinkStrip(ctx, domain) {
    brutalBox(ctx, PAD_X, STRIP_TOP, CONTENT_W, STRIP_H, 20, COLORS.yellow, 9, 5);

    const midX = CARD_W / 2;
    ctx.font = font(800, 28);
    ctx.fillStyle = COLORS.black;
    ctx.textBaseline = 'middle';
    const centerY = STRIP_TOP + STRIP_H / 2 + 2;

    ctx.textAlign = 'right';
    ctx.fillText(domain, midX - 28, centerY);
    ctx.textAlign = 'left';
    ctx.fillText('@storit.official', midX + 28, centerY);

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(midX, STRIP_TOP + 20);
    ctx.lineTo(midX, STRIP_TOP + STRIP_H - 20);
    ctx.stroke();
}

/**
 * @param {{ genreLabel: string, mascotSrc: string, result: { title: string, sub_title: string, stats: Record<string, number> } }} input
 * @returns {Promise<{ blob: Blob, url: string, width: number, height: number }>}
 */
export async function renderResultCard({ genreLabel, mascotSrc, result }) {
    const [cookie, mascot] = await Promise.all([
        loadImage('assets/logo_cookie.webp').catch(() => null),
        loadImage(mascotSrc).catch(() => null),
        ensureFonts(),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 사용할 수 없어');

    drawBackground(ctx);
    drawHeader(ctx, cookie);
    drawBadge(ctx, genreLabel);
    drawMascot(ctx, mascot);
    drawTitleBlock(ctx, result);
    drawStatsPanel(ctx, result.stats);
    drawLinkStrip(ctx, window.location.host || 'storit-landing.vercel.app');

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 변환에 실패했어'))), 'image/png');
    });

    return { blob, url: URL.createObjectURL(blob), width: CARD_W, height: CARD_H };
}
