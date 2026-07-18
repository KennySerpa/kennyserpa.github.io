/**
 * Resume site interactive behavior.
 * - Mobile navigation toggle
 * - Scroll-spy active state for in-page links
 * - Close mobile menu on link click / resize to desktop
 * - Dynamic tenure counter
 */

const MOBILE_BREAKPOINT_PX = 700;
const SCROLL_OFFSET_PX = 100;

const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const sections = Array.from(navLinks)
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

function setMenuOpen(isOpen) {
  if (!toggle || !menu) return;
  toggle.setAttribute('aria-expanded', String(isOpen));
  menu.classList.toggle('is-open', isOpen);
}

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

function initScrollSpy() {
  if (!sections.length) return;

  updateActiveNav();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    return;
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
}

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

initMobileNav();
initScrollSpy();
initTenureCounter();
