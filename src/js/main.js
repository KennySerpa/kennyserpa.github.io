/**
 * Resume site interactive behavior.
 * - Mobile navigation toggle
 * - Scroll-spy active state for in-page links
 * - Close mobile menu on link click / resize to desktop
 */

const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const sections = Array.from(navLinks).map(link =>
  document.querySelector(link.getAttribute('href'))
);

function setMenuOpen(isOpen) {
  toggle.setAttribute('aria-expanded', String(isOpen));
  menu.classList.toggle('is-open', isOpen);
}

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.contains('is-open');
    setMenuOpen(!isOpen);
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) {
      setMenuOpen(false);
    }
  });
}

function updateActiveNav() {
  const scrollPos = window.scrollY + 100;
  let activeId = '';

  for (const section of sections) {
    if (section && section.offsetTop <= scrollPos) {
      activeId = section.id;
    }
  }

  navLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

if (sections.length) {
  updateActiveNav();
  window.addEventListener('scroll', updateActiveNav, { passive: true });
}
