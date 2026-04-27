import quizData from './quiz-data.js';

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
    romance: 'assets/romance.png',
    fantasy: 'assets/fantasy.png',
    action: 'assets/action.png',
    thriller: 'assets/thriller.png',
    slice: 'assets/slice.png',
    martial_arts: 'assets/muhyeop.png',
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
    return GENRE_IMAGES[key] || 'assets/mascot.png';
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
        rootEl.querySelector('#quizBtnStart')?.addEventListener('click', () => {
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
                    <button type="button" class="btn-quiz-primary" id="quizBtnShare">결과 공유하기</button>
                    <button type="button" class="btn-quiz-secondary" id="quizBtnAgain">다시 하기</button>
                    <button type="button" class="btn-quiz-ghost" id="quizBtnPreorder">출시 알림 받기</button>
                </div>
            </div>
        `;
        rootEl.querySelector('#quizBtnShare')?.addEventListener('click', () => shareOutcome(r));
        rootEl.querySelector('#quizBtnAgain')?.addEventListener('click', () => {
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
            <div class="quiz-options" role="group" aria-label="선택지">
                ${q.options
                    .map(
                        (opt, i) => `
                    <button type="button" class="quiz-option" data-opt="${i}">${escapeHtml(opt.text)}</button>
                `,
                    )
                    .join('')}
            </div>
        </div>
    `;

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
            } else {
                phase = qi + 1;
            }
            render();
        });
    });
}

async function shareOutcome(r) {
    const url = shareUrl();
    const text = `【${r.title}】\n${r.sub_title}\n\n스토릿 웹툰 성향 테스트 해보기: ${url}`;
    const toast = rootEl?.querySelector('#quizToast');

    const showToast = (msg) => {
        if (!toast) return;
        toast.textContent = msg;
        toast.hidden = false;
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => {
            toast.hidden = true;
        }, 2500);
    };

    if (navigator.share) {
        try {
            await navigator.share({
                title: '스토릿 웹툰 성향 테스트',
                text,
                url,
            });
            showToast('공유했어!');
            return;
        } catch (e) {
            if (e && e.name === 'AbortError') return;
        }
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast('링크랑 결과 문구 복사했어!');
    } catch {
        showToast('복사에 실패했어. 직접 길게 눌러 복사해 줘.');
    }
}

function openQuiz() {
    closeMenuIfOpen();
    scores = emptyScores();
    phase = 'intro';
    resultKey = '';
    if (!dialogEl || !rootEl) return;
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
        scores = emptyScores();
        phase = 'intro';
    });

    dialogEl.addEventListener('click', (e) => {
        if (e.target === dialogEl) dialogEl.close();
    });

    const openers = ['heroOpenQuiz', 'teaserOpenQuiz', 'menuOpenQuiz', 'headerOpenQuiz'];
    for (const id of openers) {
        document.getElementById(id)?.addEventListener('click', () => openQuiz());
    }

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#webtoon-test') openQuiz();
    });
    if (window.location.hash === '#webtoon-test') {
        queueMicrotask(() => openQuiz());
    }
}
