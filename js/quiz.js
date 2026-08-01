import { beginQuizSession, trackEvent } from './analytics.js';
import quizData from './quiz-data.js';
import { renderResultCard } from './quiz-card.js';

const TIE_ORDER = ['martial_arts', 'fantasy', 'thriller', 'action', 'romance', 'slice'];

const GENRE_LABELS = {
    romance: '로맨스',
    fantasy: '판타지',
    action: '액션',
    thriller: '스릴러',
    slice: '일상',
    martial_arts: '무협',
};

const GENRE_IMAGES = {
    romance: 'assets/romance.webp',
    fantasy: 'assets/fantasy.webp',
    action: 'assets/action.webp',
    thriller: 'assets/thriller.webp',
    slice: 'assets/slice.webp',
    martial_arts: 'assets/muhyeop.webp',
};

const STAT_ORDER = [
    { key: 'focus', label: '집중력' },
    { key: 'reasoning', label: '추리력' },
    { key: 'empathy', label: '공감력' },
    { key: 'reflex', label: '순발력' },
    { key: 'inner_power', label: '내공' },
];

/** @type {HTMLElement | null} */
let rootEl = null;
/** @type {HTMLDialogElement | null} */
let dialogEl = null;
let closeMenuIfOpen = () => {};

let phase = 'intro';
/** @type {Record<string, number>} */
let scores = {};
let resultKey = '';
/** @type {HTMLElement | null} */
let cardSheetEl = null;
let cardObjectUrl = '';

function emptyScores() {
    const o = {};
    for (const g of quizData.test_metadata.genres) {
        o[g] = 0;
    }
    return o;
}

function pickWinner() {
    const genres = quizData.test_metadata.genres;
    let max = -1;
    for (const g of genres) {
        max = Math.max(max, scores[g] || 0);
    }
    const top = genres.filter((g) => (scores[g] || 0) === max);
    if (top.length === 1) return top[0];
    for (const g of TIE_ORDER) {
        if (top.includes(g)) return g;
    }
    return top[0];
}

function genreImageSrc(key) {
    return GENRE_IMAGES[key] || 'assets/mascot.webp';
}

function shareUrl() {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#webtoon-test`;
}

function buildRadarSvg(stats) {
    const cx = 100;
    const cy = 100;
    const rMax = 72;
    const n = STAT_ORDER.length;
    const values = STAT_ORDER.map(({ key }) => Math.min(100, Math.max(0, stats[key] ?? 0)));

    function pt(i, radius) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    }

    const gridLevels = [0.35, 0.65, 1];
    const gridPolys = gridLevels
        .map((lv) => {
            const pts = values.map((_, i) => pt(i, rMax * lv).join(','));
            return `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(17,24,39,0.12)" stroke-width="1"/>`;
        })
        .join('');

    const dataPts = values.map((v, i) => pt(i, rMax * (v / 100)).join(',')).join(' ');
    const labelR = rMax + 22;
    const labels = STAT_ORDER.map((s, i) => {
        const [lx, ly] = pt(i, labelR);
        return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" class="quiz-radar-label">${s.label}</text>`;
    }).join('');

    return `
        <svg class="quiz-radar-svg" viewBox="0 0 200 200" aria-hidden="true">
            ${gridPolys}
            ${labels}
            <polygon points="${dataPts}" fill="rgba(79, 70, 229, 0.25)" stroke="var(--color-indigo-600)" stroke-width="2"/>
        </svg>
    `;
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

/** 문항별 일러스트 (q1~q6) */
function questionImageSrc(questionIndex) {
    const n = questionIndex + 1;
    if (n >= 1 && n <= 6) return `assets/q${n}.webp`;
    return 'assets/q6.webp';
}

const preloadedImages = new Set();

/** 문항은 순서대로 나오므로 다음 장을 미리 받아 대기 시간을 없앤다. */
function preloadImage(src) {
    if (!src || preloadedImages.has(src)) return;
    preloadedImages.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
}

function preloadQuestionImage(questionIndex) {
    if (questionIndex < 0 || questionIndex >= quizData.questions.length) return;
    preloadImage(questionImageSrc(questionIndex));
}

/** 마지막 문항에서 호출. 결과 화면과 공유 카드가 같은 파일을 쓴다. */
function preloadResultImages() {
    for (const src of Object.values(GENRE_IMAGES)) preloadImage(src);
    preloadImage('assets/logo_cookie.webp');
}

function render() {
    if (!rootEl) return;

    const meta = quizData.test_metadata;
    const questions = quizData.questions;
    const results = quizData.results;

    if (phase === 'intro') {
        rootEl.innerHTML = `
            <div class="quiz-screen quiz-screen--intro">
                <p class="quiz-eyebrow">BONUS</p>
                <h2 class="quiz-heading">${escapeHtml(meta.title)}</h2>
                <p class="quiz-lead">${escapeHtml(meta.description)}</p>
                <p class="quiz-hint">총 ${questions.length}문항 · 약 30초 소요!</p>
                <button type="button" class="btn-quiz-primary" id="quizBtnStart">시작하기</button>
            </div>
        `;
        preloadQuestionImage(0);
        rootEl.querySelector('#quizBtnStart')?.addEventListener('click', () => {
            trackEvent('quiz_start');
            scores = emptyScores();
            phase = 0;
            render();
        });
        return;
    }

    if (phase === 'result') {
        const r = results[resultKey];
        if (!r) {
            phase = 'intro';
            render();
            return;
        }
        const partnerLabel = GENRE_LABELS[resultKey] || resultKey;
        rootEl.innerHTML = `
            <div class="quiz-screen quiz-screen--result">
                <p class="quiz-result-badge">${escapeHtml(GENRE_LABELS[resultKey] || resultKey)}</p>
                <div class="quiz-result-visual">
                    <img src="${genreImageSrc(resultKey)}" alt="" class="quiz-result-img" width="280" height="280" decoding="async" />
                </div>
                <h2 class="quiz-result-title">${escapeHtml(r.title)}</h2>
                <p class="quiz-result-sub">${escapeHtml(r.sub_title)}</p>
                <p class="quiz-result-desc">${escapeHtml(r.description)}</p>
                <div class="quiz-match">
                    <span class="quiz-match-label">찰떡궁합 장르</span>
                    <span class="quiz-match-value">${escapeHtml(partnerLabel)}</span>
                </div>
                <div class="quiz-radar-wrap">
                    <p class="quiz-radar-caption">능력치 프로필</p>
                    ${buildRadarSvg(r.stats)}
                </div>
                <p class="quiz-toast" id="quizToast" role="status" aria-live="polite" hidden></p>
                <div class="quiz-result-actions">
                    <button type="button" class="btn-quiz-primary" id="quizBtnShare">결과 이미지로 공유하기</button>
                    <button type="button" class="btn-quiz-cta" id="quizBtnPreorder">출시 알림 받기</button>
                    <button type="button" class="btn-quiz-secondary" id="quizBtnAgain">다시 하기</button>
                </div>
            </div>
        `;
        rootEl.querySelector('#quizBtnShare')?.addEventListener('click', () => shareOutcome(r));
        rootEl.querySelector('#quizBtnAgain')?.addEventListener('click', () => {
            beginQuizSession();
            scores = emptyScores();
            phase = 'intro';
            render();
        });
        rootEl.querySelector('#quizBtnPreorder')?.addEventListener('click', () => {
            if (dialogEl?.open) dialogEl.close();
            window.scrollToSection?.('preorder');
        });
        return;
    }

    const qi = phase;
    const q = questions[qi];
    const total = questions.length;
    const pct = Math.round(((qi + 1) / total) * 100);

    rootEl.innerHTML = `
        <div class="quiz-screen quiz-screen--q">
            <div class="quiz-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${qi + 1}" aria-label="질문 진행">
                <div class="quiz-progress-bar" style="width:${pct}%"></div>
            </div>
            <p class="quiz-q-index">${qi + 1} / ${total}</p>
            <h2 class="quiz-q-text">${escapeHtml(q.text)}</h2>
            <div class="quiz-q-figure" aria-hidden="true">
                <img src="${questionImageSrc(qi)}" alt="" class="quiz-q-img" width="320" height="200" loading="eager" fetchpriority="high" decoding="async" />
            </div>
            <div class="quiz-options" role="group" aria-label="선택지">
                ${q.options
                    .map(
                        (opt, i) => `
                    <button type="button" class="quiz-option quiz-option--bubble" data-opt="${i}" style="--bubble-i:${i}"><span class="quiz-option-text">${escapeHtml(opt.text)}</span></button>
                `,
                    )
                    .join('')}
            </div>
        </div>
    `;

    if (qi + 1 < total) preloadQuestionImage(qi + 1);
    else preloadResultImages();

    rootEl.querySelectorAll('.quiz-option').forEach((btn) => {
        btn.addEventListener('click', () => {
            const i = Number(btn.getAttribute('data-opt'));
            const opt = q.options[i];
            if (!opt) return;
            for (const [g, pts] of Object.entries(opt.scores)) {
                scores[g] = (scores[g] || 0) + pts;
            }
            if (qi + 1 >= total) {
                resultKey = pickWinner();
                phase = 'result';
                trackEvent('quiz_complete', { genre: resultKey });
            } else {
                phase = qi + 1;
            }
            render();
        });
    });
}

let toastTimer = 0;

function showToast(msg) {
    const toast = rootEl?.querySelector('#quizToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.hidden = true;
    }, 2500);
}

function isMobileUa() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        return navigator.userAgentData.mobile;
    }
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

/** iOS Safari는 blob URL에 download 속성이 먹지 않아 별도 안내가 필요하다. */
function isIos() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function shareText(r) {
    return `【${r.title}】\n${r.sub_title}\n\n스토릿 웹툰 성향 테스트 해보기: ${shareUrl()}`;
}

async function copyShareLink(r) {
    try {
        await navigator.clipboard.writeText(shareText(r));
        showToast('링크랑 결과 문구 복사했어!');
    } catch {
        showToast('복사에 실패했어. 직접 길게 눌러 복사해 줘.');
    }
}

/** 카드 생성이 실패했을 때 쓰는 기존 텍스트 공유. */
async function shareResultText(r) {
    const url = shareUrl();
    if (typeof navigator.share === 'function' && isMobileUa()) {
        try {
            await navigator.share({ title: '스토릿 웹툰 성향 테스트', text: shareText(r), url });
            showToast('공유했어!');
            return;
        } catch (e) {
            if (e && e.name === 'AbortError') return;
        }
    }
    await copyShareLink(r);
}

function closeCardSheet() {
    if (!cardSheetEl) return;
    cardSheetEl.remove();
    cardSheetEl = null;
    if (cardObjectUrl) {
        URL.revokeObjectURL(cardObjectUrl);
        cardObjectUrl = '';
    }
}

/**
 * 생성된 카드를 먼저 보여준 뒤, 시트 안의 새 탭으로 공유·저장을 확정한다.
 * (생성 직후 바로 navigator.share를 부르면 iOS에서 사용자 제스처가 만료돼 실패한다.)
 */
function openCardSheet(r, card) {
    closeCardSheet();
    if (!dialogEl) return;

    cardObjectUrl = card.url;
    const fileName = `storit-webtoon-test-${resultKey}.png`;
    const file = new File([card.blob], fileName, { type: 'image/png' });
    const canShareFile =
        isMobileUa() &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
    const canDownload = !isIos();

    const hint = canShareFile
        ? '인스타 스토리, 카톡 어디든 바로 보낼 수 있어!'
        : canDownload
          ? '저장한 뒤 인스타 스토리에 올려 줘!'
          : '이미지를 꾹 눌러 "사진에 추가"로 저장해 줘!';

    const sheet = document.createElement('div');
    sheet.className = 'quiz-card-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', '결과 이미지 공유');
    sheet.innerHTML = `
        <div class="quiz-card-sheet-backdrop" data-close></div>
        <div class="quiz-card-sheet-panel">
            <p class="quiz-card-sheet-title">이 이미지로 공유할까?</p>
            <img src="${card.url}" alt="성향 테스트 결과 카드" class="quiz-card-preview" width="${card.width}" height="${card.height}" />
            <p class="quiz-card-sheet-hint">${escapeHtml(hint)}</p>
            <div class="quiz-card-sheet-actions">
                ${canShareFile ? '<button type="button" class="btn-quiz-primary" data-act="share">공유하기</button>' : ''}
                ${!canShareFile && canDownload ? '<button type="button" class="btn-quiz-primary" data-act="download">이미지 저장</button>' : ''}
                <button type="button" class="btn-quiz-secondary" data-act="copy">링크 복사</button>
                <button type="button" class="btn-quiz-ghost" data-close>닫기</button>
            </div>
        </div>
    `;

    sheet.addEventListener('click', async (e) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target) return;

        if (target.closest('[data-close]')) {
            closeCardSheet();
            return;
        }

        const act = target.closest('[data-act]')?.getAttribute('data-act');
        if (act === 'share') {
            try {
                await navigator.share({ files: [file], title: '스토릿 웹툰 성향 테스트', text: shareText(r) });
                trackEvent('quiz_card_save', { genre: resultKey });
                closeCardSheet();
                showToast('공유했어!');
            } catch (err) {
                if (err && err.name === 'AbortError') return;
                showToast('공유에 실패했어. 저장해서 올려 줄래?');
            }
            return;
        }

        if (act === 'download') {
            const a = document.createElement('a');
            a.href = card.url;
            a.download = fileName;
            a.click();
            trackEvent('quiz_card_save', { genre: resultKey });
            showToast('이미지를 저장했어!');
            return;
        }

        if (act === 'copy') {
            await copyShareLink(r);
        }
    });

    cardSheetEl = sheet;
    dialogEl.appendChild(sheet);
}

async function shareOutcome(r) {
    trackEvent('quiz_share', { genre: resultKey });

    const btn = rootEl?.querySelector('#quizBtnShare');
    const label = btn?.textContent || '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '이미지 만드는 중...';
    }

    try {
        const card = await renderResultCard({
            genreLabel: GENRE_LABELS[resultKey] || resultKey,
            mascotSrc: genreImageSrc(resultKey),
            result: r,
        });
        openCardSheet(r, card);
    } catch (e) {
        console.warn('[quiz-card]', e);
        await shareResultText(r);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = label;
        }
    }
}

/**
 * @param {string} [source]
 */
function openQuiz(source = 'unknown') {
    closeMenuIfOpen();
    scores = emptyScores();
    phase = 'intro';
    resultKey = '';
    if (!dialogEl || !rootEl) return;
    beginQuizSession();
    trackEvent('quiz_open', { source });
    render();
    if (!dialogEl.open) dialogEl.showModal();
}

export function initQuiz(options = {}) {
    closeMenuIfOpen = options.closeMenuIfOpen || (() => {});
    dialogEl = document.getElementById('modal-quiz');
    rootEl = document.getElementById('quizRoot');
    const btnClose = document.getElementById('quizModalClose');

    if (!dialogEl || !rootEl) return;

    btnClose?.addEventListener('click', () => {
        if (dialogEl.open) dialogEl.close();
    });

    dialogEl.addEventListener('close', () => {
        closeCardSheet();
        scores = emptyScores();
        phase = 'intro';
    });

    dialogEl.addEventListener('cancel', (e) => {
        if (!cardSheetEl) return;
        e.preventDefault();
        closeCardSheet();
    });

    dialogEl.addEventListener('click', (e) => {
        if (e.target === dialogEl) dialogEl.close();
    });

    const openers = [
        ['heroOpenQuiz', 'hero'],
        ['teaserOpenQuiz', 'teaser'],
        ['menuOpenQuiz', 'menu'],
        ['headerOpenQuiz', 'header'],
    ];
    for (const [id, source] of openers) {
        document.getElementById(id)?.addEventListener('click', () => openQuiz(source));
    }

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#webtoon-test') openQuiz('hash');
    });
    if (window.location.hash === '#webtoon-test') {
        queueMicrotask(() => openQuiz('hash'));
    }
}
