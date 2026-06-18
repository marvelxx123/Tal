// Sticky header shrink-on-scroll
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => mobileNav.classList.remove('open'))
);

// Scroll progress bar
const progressBar = document.getElementById('progressBar');
const updateProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${(window.scrollY / max) * 100}%`;
};
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Custom cursor (smoothed with lerp)
const isTouch = window.matchMedia('(pointer: coarse)').matches;
if (!isTouch) {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
  });
  const animateRing = () => {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(animateRing);
  };
  animateRing();
  document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });
}

// Kinetic letter-by-letter hero text
document.querySelectorAll('[data-kinetic]').forEach((el, lineIndex) => {
  const text = el.textContent;
  el.textContent = '';
  text.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = char === ' ' ? ' ' : char;
    span.style.opacity = '0';
    span.style.transform = 'translateY(100%) rotate(6deg)';
    span.style.transition = `opacity .6s var(--ease) ${(lineIndex * 0.15 + i * 0.025)}s, transform .6s var(--ease) ${(lineIndex * 0.15 + i * 0.025)}s`;
    el.appendChild(span);
  });
});
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-kinetic] .letter').forEach(span => {
      span.style.opacity = '1';
      span.style.transform = 'translateY(0) rotate(0)';
    });
  });
});

// Reveal-on-scroll generic observer (mask text + journey panels fade)
const maskEl = document.querySelector('[data-mask]');
if (maskEl) {
  const maskObserver = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        maskEl.classList.add('revealed');
        maskObserver.disconnect();
      }
    }),
    { threshold: 0.5 }
  );
  maskObserver.observe(maskEl);
}

// Pinned horizontal scroll story
const journeySection = document.querySelector('.journey');
const journeyTrack = document.getElementById('journeyTrack');
if (journeySection && journeyTrack && window.innerWidth > 760) {
  const updateJourney = () => {
    const rect = journeySection.getBoundingClientRect();
    const total = journeySection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);
    const maxScroll = journeyTrack.scrollWidth - window.innerWidth + 64;
    journeyTrack.style.transform = `translateX(-${progress * maxScroll}px)`;
  };
  window.addEventListener('scroll', updateJourney, { passive: true });
  window.addEventListener('resize', updateJourney);
  updateJourney();
}

// 3D tilt cards
document.querySelectorAll('[data-tilt]').forEach(card => {
  const inner = card.querySelector('.tilt-inner');
  const glow = card.querySelector('.tilt-glow');
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -12;
    const rotateY = ((x / rect.width) - 0.5) * 12;
    inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
    if (glow) {
      glow.style.setProperty('--mx', `${x}px`);
      glow.style.setProperty('--my', `${y}px`);
    }
  });
  card.addEventListener('mouseleave', () => {
    inner.style.transform = 'rotateX(0) rotateY(0)';
  });
});

// Magnetic buttons
document.querySelectorAll('[data-magnetic]').forEach(el => {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'translate(0, 0)';
  });
});

// Count-up stats
document.querySelectorAll('.stat-value').forEach(stat => {
  const target = parseInt(stat.dataset.count, 10);
  const counterObserver = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        const duration = 1600;
        const start = performance.now();
        const tick = now => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          stat.textContent = Math.floor(eased * target).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        counterObserver.disconnect();
      }
    }),
    { threshold: 0.4 }
  );
  counterObserver.observe(stat);
});
