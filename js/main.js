// Header scroll detection
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

// Menu toggle
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

// Smooth scroll to section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const headerHeight = 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerHeight;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    // Close menu if open
    if (isMenuOpen) {
        toggleMenu();
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    if (isMenuOpen && !menuToggle.contains(event.target) && !menuDropdown.contains(event.target)) {
        toggleMenu();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial scroll check
    handleScroll();
    
    // Hero button click handler
    const heroButton = document.querySelector('.btn-hero');
    if (heroButton) {
        heroButton.addEventListener('click', function() {
            scrollToSection('cta');
        });
    }
    
    // CTA buttons click handlers (placeholder - can be updated with actual app store links)
    const ctaButtons = document.querySelectorAll('.btn-cta');
    ctaButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            // Placeholder - add actual app store links here
            console.log('App store button clicked:', index === 0 ? 'App Store' : 'Google Play');
        });
    });
    
    console.log('Vanilla JS version initialized');
});

