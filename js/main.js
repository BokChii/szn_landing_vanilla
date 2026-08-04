import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initGa, initQuizLog, trackEvent } from './analytics.js';
import { initQuiz } from './quiz.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let supabase = null;
let preorderTable = 'pre_registrations';
let quizEventsTable = 'quiz_events';
let shareEventsTable = 'share_events';

let isScrolled = false;
const header = document.getElementById('header');

function handleScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const shouldBeScrolled = scrollY > 50;

    if (shouldBeScrolled !== isScrolled) {
        isScrolled = shouldBeScrolled;
        if (isScrolled) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (scrollY > 320) {
            backToTop.classList.add('back-to-top--visible');
        } else {
            backToTop.classList.remove('back-to-top--visible');
        }
    }
}

let isMenuOpen = false;
const menuToggle = document.getElementById('menuToggle');
const menuDropdown = document.getElementById('menuDropdown');
const menuIcon = document.getElementById('menuIcon');
const closeIcon = document.getElementById('closeIcon');

function toggleMenu() {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
        menuDropdown.classList.remove('hidden');
        menuIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
    } else {
        menuDropdown.classList.add('hidden');
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
    }
}

/** 고정 헤더 아래 카드가 가리지 않도록 쓰는 여백(px). */
const SCROLL_GAP = 12;

function getHeaderHeight() {
    if (!header) return 68;
    return Math.ceil(header.getBoundingClientRect().height);
}

/**
 * 요소를 'start'(헤더 바로 아래) 또는 'center'(화면 세로 중앙)에 맞출 scrollY.
 * center일 때 카드 전체가 보이도록 위·아래를 클램프한다.
 * @param {HTMLElement} element
 * @param {'start' | 'center'} [align]
 */
function targetScrollTop(element, align = 'start') {
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.pageYOffset;
    const elementHeight = rect.height;
    const headerH = getHeaderHeight();
    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

    let top;
    if (align === 'center') {
        // 카드 중앙 = 뷰포트 세로 중앙
        top = elementTop + elementHeight / 2 - vh / 2;
        // 위: 카드 상단이 헤더 아래로
        const yMax = elementTop - headerH - SCROLL_GAP;
        // 아래: 카드 하단이 뷰포트 안에
        const yMin = elementTop + elementHeight - vh;
        if (Number.isFinite(yMin) && Number.isFinite(yMax) && yMin <= yMax) {
            top = Math.min(Math.max(top, yMin), yMax);
        } else {
            // 카드가 뷰보다 크면 상단 정렬
            top = yMax;
        }
    } else {
        top = elementTop - headerH - SCROLL_GAP;
    }

    return Math.max(0, Math.min(maxScroll, Math.round(top)));
}

/**
 * 섹션으로 스크롤. 사전등록(#preorder)은 이메일 카드가 화면 중앙에 오도록 맞춘다.
 * smooth 직후 한 번 더 보정해서 모달 닫힘·header.scrolled 전환 어긋남을 줄인다.
 * @param {string} sectionId
 * @param {{ behavior?: ScrollBehavior, align?: 'start' | 'center' }} [options]
 */
function scrollToSection(sectionId, options = {}) {
    const element = document.getElementById(sectionId);
    if (!element) {
        if (isMenuOpen) toggleMenu();
        return;
    }

    const behavior = options.behavior || 'smooth';
    // 사전등록 카드는 가운데, 그 외 메뉴 섹션은 상단 정렬
    const align = options.align || (sectionId === 'preorder' ? 'center' : 'start');

    const apply = (scrollBehavior) => {
        window.scrollTo({
            top: targetScrollTop(element, align),
            behavior: scrollBehavior,
        });
    };

    apply(behavior);

    if (behavior === 'smooth') {
        const correct = () => {
            const desired = targetScrollTop(element, align);
            if (Math.abs(window.pageYOffset - desired) > 2) {
                window.scrollTo({ top: desired, behavior: 'auto' });
            }
        };
        // scrollend 가 중간에 뜨는 경우를 대비해 최종 안착을 한 번 더 보정한다.
        if ('onscrollend' in window) {
            window.addEventListener('scrollend', correct, { once: true });
        }
        window.setTimeout(correct, 450);
        window.setTimeout(correct, 850);
    }

    if (isMenuOpen) {
        toggleMenu();
    }
}

window.scrollToSection = scrollToSection;
window.toggleMenu = toggleMenu;

const pendingEmail = { value: '' };

async function loadSupabaseFromConfig() {
    try {
        const mod = await import('./config.js');
        const url = mod.SUPABASE_URL;
        const key = mod.SUPABASE_ANON_KEY;
        preorderTable = mod.PREORDER_TABLE || preorderTable;
        quizEventsTable = mod.QUIZ_EVENTS_TABLE || quizEventsTable;
        shareEventsTable = mod.SHARE_EVENTS_TABLE || shareEventsTable;
        if (url && key) {
            supabase = createClient(url, key);
        }
        initGa(mod.GA_MEASUREMENT_ID || '');
        initQuizLog({ supabase, table: quizEventsTable, shareTable: shareEventsTable });
    } catch (e) {
        console.warn('Supabase config not loaded (add js/config.js from config.example.js):', e);
    }
}

function showResultModal(title, message) {
    const dialog = document.getElementById('modal-preorder-result');
    const bodyEl = document.getElementById('modal-preorder-result-body');
    const titleEl = document.getElementById('modal-preorder-result-title');
    if (!dialog || !bodyEl || !titleEl) return;
    titleEl.textContent = title;
    bodyEl.textContent = message;
    if (!dialog.open) dialog.showModal();
}

function wirePreorderModals() {
    const confirmDialog = document.getElementById('modal-preorder-confirm');
    const confirmBody = document.getElementById('modal-preorder-confirm-body');
    const btnCancel = document.getElementById('modalPreorderCancel');
    const btnConfirm = document.getElementById('modalPreorderConfirm');
    const resultDialog = document.getElementById('modal-preorder-result');
    const btnResultOk = document.getElementById('modalPreorderResultOk');
    const emailInput = document.getElementById('preorder-email');
    const submitBtn = document.getElementById('preorderSubmit');
    const errEl = document.getElementById('preorder-email-error');

    if (!confirmDialog || !confirmBody || !btnCancel || !btnConfirm || !resultDialog || !btnResultOk || !emailInput || !submitBtn) {
        return;
    }

    const btnPreorderLabel = submitBtn.querySelector('.btn-preorder-label');
    const btnPreorderLoading = submitBtn.querySelector('.btn-preorder-loading');
    let preorderInFlight = false;

    function setPreorderLoading(loading) {
        submitBtn.disabled = loading;
        btnConfirm.disabled = loading;
        btnCancel.disabled = loading;
        if (loading) {
            submitBtn.setAttribute('aria-busy', 'true');
            btnConfirm.setAttribute('aria-busy', 'true');
        } else {
            submitBtn.removeAttribute('aria-busy');
            btnConfirm.removeAttribute('aria-busy');
        }
        if (btnPreorderLabel) btnPreorderLabel.hidden = loading;
        if (btnPreorderLoading) btnPreorderLoading.hidden = !loading;
        submitBtn.classList.toggle('btn-preorder--busy', loading);
    }

    function isDuplicateEmailError(error) {
        if (!error) return false;
        if (error.code === '23505') return true;
        const msg = String(error.message || '').toLowerCase();
        return msg.includes('duplicate key') || msg.includes('already exists');
    }

    function clearEmailFieldError() {
        if (errEl) {
            errEl.textContent = '';
            errEl.hidden = true;
        }
        emailInput.classList.remove('preorder-input--error');
    }

    function showEmailFieldError(message) {
        if (errEl) {
            errEl.textContent = message;
            errEl.hidden = false;
        }
        emailInput.classList.add('preorder-input--error');
        emailInput.focus();
    }

    emailInput.addEventListener('input', clearEmailFieldError);
    emailInput.addEventListener('change', clearEmailFieldError);

    btnCancel.addEventListener('click', () => {
        if (preorderInFlight) return;
        if (confirmDialog.open) confirmDialog.close();
    });

    btnConfirm.addEventListener('click', async () => {
        // Guard before any await — double-tap used to fire two inserts;
        // the first succeeds and the second surfaces as "already registered".
        if (preorderInFlight) return;
        preorderInFlight = true;

        if (confirmDialog.open) confirmDialog.close();
        if (!supabase) {
            preorderInFlight = false;
            showResultModal(
                '연결을 확인해 주세요',
                'Supabase 설정이 필요합니다. 배포 환경의 환경 변수와 빌드가 올바른지 확인해 주세요.',
            );
            return;
        }

        setPreorderLoading(true);

        const email = pendingEmail.value;
        let error;
        try {
            const result = await supabase.from(preorderTable).insert({ email });
            error = result.error;
        } catch (e) {
            console.warn('[preorder] network/insert exception', e);
            setPreorderLoading(false);
            preorderInFlight = false;
            showResultModal(
                '연결 오류',
                '네트워크를 확인한 뒤 다시 시도해 주세요.',
            );
            return;
        }

        setPreorderLoading(false);
        preorderInFlight = false;

        if (error) {
            console.warn('[preorder] insert error', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
                email,
            });
            if (isDuplicateEmailError(error)) {
                // Soft-success: DB already has this address (retry / double submit).
                showResultModal(
                    '이미 알림 신청되어 있어요',
                    '이 이메일로 출시 소식을 보내드릴게요.',
                );
                emailInput.value = '';
                clearEmailFieldError();
            } else {
                showResultModal(
                    '잠시 후 다시 시도해 주세요',
                    '일시적인 오류로 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                );
            }
            return;
        }

        showResultModal(
            '알림 등록 완료',
            '출시 소식은 이 메일로만 보내드릴게요. 아래 버튼으로 친구에게도 알려주세요!',
        );
        emailInput.value = '';
        clearEmailFieldError();
    });

    btnResultOk.addEventListener('click', () => {
        if (resultDialog.open) resultDialog.close();
        const shareBtn = document.getElementById('preorderShare');
        if (shareBtn) {
            shareBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    submitBtn.addEventListener('click', () => {
        clearEmailFieldError();
        const raw = emailInput.value;
        const email = String(raw || '')
            .trim()
            .toLowerCase();

        if (!raw.trim()) {
            showEmailFieldError('이메일을 입력해 주세요.');
            return;
        }

        if (!EMAIL_RE.test(email)) {
            showEmailFieldError('올바른 이메일 형식으로 입력해 주세요.');
            return;
        }

        pendingEmail.value = email;
        confirmBody.textContent = `${email}\n\n출시·오픈 소식 알림만 보내드려요. 스팸은 보내지 않아요.`;
        if (!confirmDialog.open) confirmDialog.showModal();
    });
}

/** Native share sheet is preferred on phones; desktop Chrome/Edge also expose navigator.share. */
function canUseNativeShare() {
    if (typeof navigator.share !== 'function') return false;
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        return navigator.userAgentData.mobile;
    }
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function wirePreorderShare() {
    const btn = document.getElementById('preorderShare');
    const toast = document.getElementById('preorderShareToast');
    if (!btn) return;

    const showToast = (msg) => {
        if (!toast) return;
        toast.textContent = msg;
        toast.hidden = false;
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => {
            toast.hidden = true;
        }, 2500);
    };

    btn.addEventListener('click', async () => {
        trackEvent('preorder_share', { source: 'preorder' });

        const url = 'https://storit-landing.vercel.app/';
        const text = `웹툰 퀴즈로 리워드 받는 앱 '스토릿' 출시 준비 중이야!\n사전 예약하고 같이 기다리자.\n${url}`;

        if (canUseNativeShare()) {
            try {
                await navigator.share({
                    title: '스토릿 사전 예약',
                    text,
                    url,
                });
                showToast('공유했어요!');
                return;
            } catch (e) {
                if (e && e.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(text);
            showToast('링크를 복사했어요. 친구에게 붙여넣어 주세요!');
        } catch {
            showToast('복사에 실패했어요. 주소창 링크를 직접 공유해 주세요.');
        }
    });
}

document.addEventListener('click', function (event) {
    if (isMenuOpen && menuToggle && menuDropdown && !menuToggle.contains(event.target) && !menuDropdown.contains(event.target)) {
        toggleMenu();
    }
});

document.addEventListener('DOMContentLoaded', async function () {
    await loadSupabaseFromConfig();

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    const heroPreorderBtn = document.querySelector('.hero-cta-row .btn-hero:not(.btn-hero--secondary)');
    if (heroPreorderBtn) {
        heroPreorderBtn.addEventListener('click', function () {
            scrollToSection('preorder');
        });
    }

    initQuiz({
        closeMenuIfOpen: () => {
            if (isMenuOpen) toggleMenu();
        },
    });

    wirePreorderModals();
    wirePreorderShare();
    wireLegalModals();

    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

function wireLegalModals() {
    const modalTerms = document.getElementById('modal-terms');
    const modalPrivacy = document.getElementById('modal-privacy');
    const btnTermsClose = document.getElementById('modalTermsClose');
    const btnPrivacyClose = document.getElementById('modalPrivacyClose');
    const linkTerms = document.getElementById('footerLinkTerms');
    const linkPrivacy = document.getElementById('footerLinkPrivacy');

    if (linkTerms && modalTerms) {
        linkTerms.addEventListener('click', function (e) {
            e.preventDefault();
            if (!modalTerms.open) modalTerms.showModal();
        });
    }
    if (linkPrivacy && modalPrivacy) {
        linkPrivacy.addEventListener('click', function (e) {
            e.preventDefault();
            if (!modalPrivacy.open) modalPrivacy.showModal();
        });
    }
    if (btnTermsClose && modalTerms) {
        btnTermsClose.addEventListener('click', function () {
            if (modalTerms.open) modalTerms.close();
        });
    }
    if (btnPrivacyClose && modalPrivacy) {
        btnPrivacyClose.addEventListener('click', function () {
            if (modalPrivacy.open) modalPrivacy.close();
        });
    }
}
