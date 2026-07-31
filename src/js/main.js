/**
 * Resume site interactive behavior.
 *
 * Responsibilities:
 *   - Mobile navigation toggle
 *   - Scroll-spy active state for in-page links
 *   - Flip-card highlights (client-only)
 *   - PDF download (static asset, no remote API)
 *
 * Tenure is a static calendar claim in HTML ("Experience since Aug 2023")
 * so the site and PDF stay accurate without a live Date.now() counter.
 */

const MOBILE_BREAKPOINT_PX = 700;
const SCROLL_OFFSET_PX = 100;
const STATIC_PDF_URL = './resume.pdf';

const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const sections = Array.from(navLinks)
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

/**
 * Set the mobile menu open/closed state.
 * @param {boolean} isOpen
 */
function setMenuOpen(isOpen) {
  if (!toggle || !menu) return;
  toggle.setAttribute('aria-expanded', String(isOpen));
  menu.classList.toggle('is-open', isOpen);
}

/**
 * Initialize the mobile hamburger navigation.
 */
function initMobileNav() {
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.contains('is-open');
    setMenuOpen(!isOpen);
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
      setMenuOpen(false);
    }
  });
}

/**
 * Update the active in-page nav link based on scroll position.
 */
function updateActiveNav() {
  const scrollPos = window.scrollY + SCROLL_OFFSET_PX;
  let activeId = '';

  for (const section of sections) {
    if (section.offsetTop <= scrollPos) {
      activeId = section.id;
    }
  }

  navLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

/**
 * Initialize scroll-spy navigation highlighting.
 */
function initScrollSpy() {
  if (!sections.length) return;

  updateActiveNav();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    return;
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
}

/**
 * Initialize the career highlight flip cards (no network calls).
 */
function initFlipCards() {
  const cards = document.querySelectorAll('.highlight-card');
  cards.forEach(card => {
    const flip = () => {
      card.classList.toggle('flipped');
    };

    card.addEventListener('click', flip);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });
  });
}

/**
 * Open the static resume PDF shipped with the site.
 * No remote API — works on any network that can load GitHub Pages.
 */
function downloadResumePdf() {
  window.open(STATIC_PDF_URL, '_blank', 'noopener,noreferrer');
}

/**
 * Bind event listeners to elements with data-action attributes.
 * Keeps behavior in JavaScript instead of inline onclick handlers.
 */
function initActionButtons() {
  document.querySelectorAll('[data-action="download-pdf"]').forEach(button => {
    button.addEventListener('click', downloadResumePdf);
  });
}

/**
 * Boot the application once the DOM is ready.
 */
function init() {
  if (location.search.includes('print=1')) {
    document.body.classList.add('print-mode');
  }

  initMobileNav();
  initScrollSpy();
  initFlipCards();
  initActionButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
