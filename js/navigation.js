/**
 * navigation.js — mobile nav toggle + theme (dark mode) toggle.
 * Shared across every page that includes the standard site header.
 */
(function () {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Apply saved theme as early as possible to avoid a flash.
  applyTheme(typeof RTStorage !== 'undefined' ? RTStorage.getTheme() : (localStorage.getItem('rt_theme') || 'light'));

  document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
        document.body.classList.toggle('nav-open');
      });
      mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        document.body.classList.remove('nav-open');
      }));
    }

    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        RTStorage.setTheme(next);
      });
    });

    // mark active nav link based on current page
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a, .mobile-nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === path) a.classList.add('active');
    });
  });
})();
