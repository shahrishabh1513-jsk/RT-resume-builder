/**
 * navigation.js — mobile hamburger menu + active link highlighting.
 * The app is light-theme only, so there is no theme switching here.
 */
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

  // mark the active nav link based on the current page
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a, .mobile-nav a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
});
