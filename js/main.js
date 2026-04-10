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

    const btnPreorderLabel = submitBtn.querySelector('.btn-preorder-label');
    const btnPreorderLoading = submitBtn.querySelector('.btn-preorder-loading');

    function setPreorderLoading(loading) {
        submitBtn.disabled = loading;
        if (loading) {
            submitBtn.setAttribute('aria-busy', 'true');
        } else {
            submitBtn.removeAttribute('aria-busy');
        }
        if (btnPreorderLabel) btnPreorderLabel.hidden = loading;
        if (btnPreorderLoading) btnPreorderLoading.hidden = !loading;
        submitBtn.classList.toggle('btn-preorder--busy', loading);
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
        } catch {
            setPreorderLoading(false);
            showResultModal(
                '연결 오류',
                '네트워크를 확인한 뒤 다시 시도해 주세요.',
            );
            return;
        }

        setPreorderLoading(false);

        if (error) {
            const code = error.code;
            const msg = error.message || '';
            if (code === '23505' || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
                showEmailFieldError('이미 등록된 이메일이에요. 다른 주소로 시도해 주세요.');
                emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            '출시 소식은 이 메일로만 보내드릴게요. 기다려 주셔서 고마워요!',
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
        confirmBody.textContent = `${email}\n\n출시·오픈 소식 알림만 보내드려요.<br> 스팸은 보내지 않아요.`;
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
