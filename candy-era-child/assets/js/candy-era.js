/**
 * Candy Era — Modern UI interactions
 * No dependencies. Vanilla JS only.
 */
(function () {
  'use strict';

  /* ─── Scroll Progress Bar ──────────────────────────────────── */
  const progressBar = document.createElement('div');
  progressBar.id = 'ce-progress-bar';
  document.body.prepend(progressBar);

  /* ─── Header scroll state ──────────────────────────────────── */
  const header = document.getElementById('site-header') || document.querySelector('.site-header');

  function onScroll() {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;

    // Progress bar
    progressBar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';

    // Header glass effect
    if (header) {
      header.classList.toggle('scrolled', scrolled > 40);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ─── Section Reveal on Scroll (IntersectionObserver) ─────── */
  function initReveal() {
    const sections = document.querySelectorAll(
      '.elementor-section, .e-con, .elementor-widget'
    );

    // Skip elements already in view on load (above the fold)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ce-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    sections.forEach((el) => {
      // Don't animate the very first section (hero)
      if (el.closest('#site-header') || el.closest('header')) return;

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
        // Already visible — just show it without animation
        el.classList.add('ce-visible');
      } else {
        el.classList.add('ce-reveal');
        io.observe(el);
      }
    });
  }

  /* ─── Smooth anchor scroll (for nav links like #what) ──────── */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 80;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ─── Cart count bounce animation ──────────────────────────── */
  function initCartBounce() {
    const observer = new MutationObserver(() => {
      const count = document.querySelector('.cc_cart_count');
      if (!count) return;
      count.style.transform = 'scale(1.4)';
      setTimeout(() => { count.style.transform = 'scale(1)'; }, 250);
    });

    const cartEl = document.querySelector('.cc_cart_count');
    if (cartEl) {
      observer.observe(cartEl, { childList: true, subtree: true, characterData: true });
    }
  }

  /* ─── Product image lazy-load shimmer ───────────────────────── */
  function initImageShimmer() {
    const imgs = document.querySelectorAll('.woocommerce ul.products li.product img');
    imgs.forEach((img) => {
      if (!img.complete) {
        img.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
        img.style.backgroundSize = '200% 100%';
        img.addEventListener('load', () => {
          img.style.background = '';
          img.style.backgroundSize = '';
        });
      }
    });
  }

  /* ─── Stagger product cards on grid load ───────────────────── */
  function initProductStagger() {
    document.querySelectorAll('.woocommerce ul.products li.product').forEach((card, i) => {
      card.style.transitionDelay = (i * 0.06) + 's';
    });
  }

  /* ─── Init on DOM ready ─────────────────────────────────────── */
  function init() {
    initReveal();
    initSmoothAnchors();
    initCartBounce();
    initImageShimmer();
    initProductStagger();
    onScroll(); // run once for initial state
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─── Re-run after Elementor dynamic content loads ─────────── */
  document.addEventListener('elementor/frontend/init', init);
})();
