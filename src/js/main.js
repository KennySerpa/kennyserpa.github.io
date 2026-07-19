/**
 * Resume site interactive behavior.
 *
 * Responsibilities:
 *   - Mobile navigation toggle
 *   - Scroll-spy active state for in-page links
 *   - Dynamic tenure counter
 *   - Flip-card highlights and analytics tracking
 *   - PDF download
 */

const MOBILE_BREAKPOINT_PX = 700;
const SCROLL_OFFSET_PX = 100;

const API_URL = 'https://api.kserpa.com';
const FALLBACK_PDF_URL = './resume.pdf';
const SESSION_KEY = 'ks_session_id';

/**
 * Track whether the analytics backend is reachable.
 * Starts as `null` (unknown) and is updated after the first request.
 * @type {boolean|null}
 */
let backendAvailable = null;

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
 * Calculate and display tenure since the start date.
 */
function initTenureCounter() {
  const startDate = new Date('2023-08-26');
  const now = new Date();

  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();
  const dayDiff = now.getDate() - startDate.getDate();

  if (dayDiff < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const yearPart = years > 0 ? `${years} year${years === 1 ? '' : 's'}` : '';
  const monthPart = months > 0 ? `${months} month${months === 1 ? '' : 's'}` : '';
  const tenure = [yearPart, monthPart].filter(Boolean).join(', ');

  const counter = document.getElementById('tenure-counter');
  if (counter) {
    counter.textContent = tenure;
  }
}

/**
 * Generate a UUID-like session identifier.
 * @returns {string}
 */
function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Get the existing session id or create a new one.
 * @returns {string}
 */
function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Send an analytics event to the backend.
 * Failures are swallowed silently so the UI never breaks when the backend is down.
 *
 * @param {string} eventType
 * @param {string|null} cardId
 */
async function trackEvent(eventType, cardId = null) {
  try {
    const response = await fetch(`${API_URL}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getOrCreateSessionId(),
        eventType,
        cardId,
      }),
    });
    backendAvailable = response.ok;
  } catch {
    backendAvailable = false;
    // Silently ignore analytics failures; tracking must not affect the site.
  }
}

/**
 * Initialize the career highlight flip cards.
 */
function initFlipCards() {
  const cards = document.querySelectorAll('.highlight-card');
  cards.forEach(card => {
    const flip = () => {
      card.classList.toggle('flipped');
      trackEvent('card_flip', card.dataset.cardId);
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
 * Check whether the backend PDF endpoint is reachable.
 * Uses a lightweight HEAD request to avoid triggering a full PDF render.
 *
 * @returns {Promise<boolean>}
 */
async function isBackendPdfAvailable() {
  try {
    const response = await fetch(`${API_URL}/api/resume.pdf`, { method: 'HEAD', mode: 'cors' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Open the resume PDF.
 * Prefers the backend-generated PDF for analytics, but falls back to a static
 * local PDF if the backend is unreachable so the site keeps working.
 */
async function downloadResumePdf() {
  trackEvent('pdf_download');

  const useBackend = backendAvailable ?? (await isBackendPdfAvailable());
  const pdfUrl = useBackend ? `${API_URL}/api/resume.pdf` : FALLBACK_PDF_URL;

  window.open(pdfUrl, '_blank');
}

/**
 * Expose the PDF function globally so the inline onclick handler can use it.
 */
window.downloadResumePdf = downloadResumePdf;

/**
 * Boot the application once the DOM is ready.
 */
function init() {
  if (location.search.includes('print=1')) {
    document.body.classList.add('print-mode');
  }

  initMobileNav();
  initScrollSpy();
  initTenureCounter();
  initFlipCards();
  trackEvent('page_view');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
