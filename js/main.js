import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let supabase = null;
let preorderTable = 'pre_registrations';

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

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const headerHeight = 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerHeight;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
        });
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
        if (url && key) {
            supabase = createClient(url, key);
        }
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
        if (confirmDialog.open) confirmDialog.close();
    });

    btnConfirm.addEventListener('click', async () => {
        if (confirmDialog.open) confirmDialog.close();
        if (!supabase) {
            showResultModal(
                '설정 필요',
                'Supabase 연결 정보가 없습니다. 배포 환경에 js/config.js를 추가했는지 확인해 주세요.',
            );
            return;
        }

        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');

        const email = pendingEmail.value;
        let error;
        try {
            const result = await supabase.from(preorderTable).insert({ email });
            error = result.error;
        } catch {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
            showResultModal(
                '등록 실패',
                '네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.',
            );
            return;
        }

        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');

        if (error) {
            const code = error.code;
            const msg = error.message || '';
            if (code === '23505' || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
                showResultModal(
                    '이미 등록됨',
                    '이미 사전 예약에 등록된 이메일입니다. 다른 주소를 입력해 주세요.',
                );
            } else {
                showResultModal(
                    '등록 실패',
                    '일시적인 오류로 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.',
                );
            }
            return;
        }

        showResultModal(
            '등록 완료',
            '사전 예약이 완료되었습니다. 정식 출시 소식을 이메일로 안내드리겠습니다.',
        );
        emailInput.value = '';
        clearEmailFieldError();
    });

    btnResultOk.addEventListener('click', () => {
        if (resultDialog.open) resultDialog.close();
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
        confirmBody.textContent = `아래 이메일로 출시 알림을 보내드립니다.\n\n${email}\n\n계속하시겠습니까?`;
        if (!confirmDialog.open) confirmDialog.showModal();
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

    const heroButton = document.querySelector('.btn-hero');
    if (heroButton) {
        heroButton.addEventListener('click', function () {
            scrollToSection('preorder');
        });
    }

    wirePreorderModals();
});
