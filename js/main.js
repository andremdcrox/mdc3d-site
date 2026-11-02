// Menu mobile toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // marca o link ativo pelo arquivo atual
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    if (a.getAttribute('data-page') === path) a.classList.add('active');
  });

  initParticles();
  initReveal();
  initScrollProgress();
  initHeroTilt();
});

function initHeroTilt() {
  const el = document.querySelector('.hero-visual');
  if (!el || window.matchMedia('(pointer: coarse)').matches) return;

  el.style.transition = 'transform .3s ease';
  el.style.willChange = 'transform';

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(4px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
  });
}

function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  const update = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function initParticles() {
  const field = document.createElement('div');
  field.className = 'particles-field';
  document.body.prepend(field);

  const COUNT = 22;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('span');
    p.className = 'particle' + (i % 2 === 0 ? '' : ' purple');
    const size = (Math.random() * 3 + 2).toFixed(1);
    const dur = (Math.random() * 10 + 10).toFixed(1);
    const delay = (Math.random() * 14).toFixed(1);
    const drift = (Math.random() * 60 - 30).toFixed(0);
    p.style.left = (Math.random() * 100).toFixed(1) + 'vw';
    p.style.setProperty('--size', size + 'px');
    p.style.setProperty('--dur', dur + 's');
    p.style.setProperty('--delay', delay + 's');
    p.style.setProperty('--drift', drift + 'px');
    field.appendChild(p);
  }
}

function initReveal() {
  const targets = document.querySelectorAll('.section-head, .card, .product-card, .step, .panel, .cta-banner, .problem-item, .brand-card, .youtube-embed, .youtube-cta');
  if (!targets.length) return;

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = ((i % 4) * 0.08).toFixed(2) + 's';
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach(el => obs.observe(el));
}

function toast(msg) {
  let el = document.querySelector('.mdc-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'mdc-toast';
    el.style.cssText = `
      position:fixed; left:50%; bottom:28px; transform:translateX(-50%) translateY(20px);
      background:rgba(18,14,36,0.95); border:1px solid rgba(92,139,255,0.4);
      color:#f1f5f9; padding:13px 22px; border-radius:999px; font-size:0.88rem;
      box-shadow:0 10px 30px rgba(0,0,0,0.4); z-index:200; opacity:0;
      transition:opacity .25s ease, transform .25s ease; pointer-events:none;
      font-family:'Inter',sans-serif;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2600);
}
