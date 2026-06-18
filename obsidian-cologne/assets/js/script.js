// Sticky header shrink-on-scroll
const header = document.getElementById('siteHeader');
const onScroll = () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});
mobileNav.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => mobileNav.classList.remove('open'))
);

// Scroll-reveal animations
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach(el => revealObserver.observe(el));

// Hero ambient particles
const particleField = document.getElementById('heroParticles');
const PARTICLE_COUNT = 28;
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const p = document.createElement('span');
  p.className = 'particle';
  p.style.left = `${Math.random() * 100}%`;
  p.style.bottom = `-${Math.random() * 20}px`;
  p.style.animationDuration = `${10 + Math.random() * 12}s`;
  p.style.animationDelay = `${Math.random() * 10}s`;
  particleField.appendChild(p);
}

// Play button mock interaction
const playButton = document.querySelector('.play-button');
if (playButton) {
  playButton.addEventListener('click', () => {
    playButton.style.transform = 'scale(0.9)';
    setTimeout(() => (playButton.style.transform = ''), 150);
  });
}
