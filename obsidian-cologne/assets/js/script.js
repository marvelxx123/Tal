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

// Carousel arrow controls
const track = document.getElementById('productCarousel');
const prevBtn = document.getElementById('carouselPrev');
const nextBtn = document.getElementById('carouselNext');
if (track && prevBtn && nextBtn) {
  const scrollAmount = () => track.clientWidth * 0.7;
  prevBtn.addEventListener('click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
}

// Hero mouse-parallax on glows
const glows = document.querySelectorAll('.glow-parallax');
const heroEl = document.getElementById('hero');
if (heroEl && glows.length) {
  heroEl.addEventListener('mousemove', e => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2;
    const y = (e.clientY / innerHeight - 0.5) * 2;
    glows.forEach((glow, i) => {
      const strength = i === 0 ? 18 : -22;
      glow.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
  });
}

// Scroll-spy active nav link
const navLinks = document.querySelectorAll('.primary-nav a');
const sections = Array.from(navLinks)
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const spyObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = `#${entry.target.id}`;
        navLinks.forEach(link =>
          link.classList.toggle('active', link.getAttribute('href') === id)
        );
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
sections.forEach(section => spyObserver.observe(section));

// Play button mock interaction
const playButton = document.querySelector('.play-button');
if (playButton) {
  playButton.addEventListener('click', () => {
    playButton.style.transform = 'scale(0.9)';
    setTimeout(() => (playButton.style.transform = ''), 150);
  });
}
