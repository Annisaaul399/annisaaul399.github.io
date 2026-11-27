/* =====================================================
   SCRIPT.JS — Annisa Aulia Portfolio
   Isi: helper bersama → navbar → reveal → scroll-spy
        → portfolio → slider sertifikat → achievements
   ===================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasIO = 'IntersectionObserver' in window;


  /* =====================================================
     HELPER BERSAMA
     ===================================================== */

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  /* Satu lightbox (<dialog>) dipakai portfolio, sertifikat, dan achievements */
  const lightbox = (function () {
    let box = null, img = null, cap = null;
    const closeHandlers = [];

    function build() {
      box = document.createElement('dialog');
      box.className = 'pf-lightbox';
      box.setAttribute('aria-label', 'Image preview');
      box.innerHTML =
        '<button type="button" class="pf-lightbox-close" aria-label="Close">&#10005;</button>' +
        '<figure><img alt=""><figcaption></figcaption></figure>';
      document.body.appendChild(box);

      img = box.querySelector('img');
      cap = box.querySelector('figcaption');

      box.querySelector('.pf-lightbox-close').addEventListener('click', function () { box.close(); });
      box.addEventListener('click', function (e) { if (e.target === box) box.close(); }); // klik area gelap
      box.addEventListener('close', function () { closeHandlers.forEach(function (fn) { fn(); }); });
    }

    return {
      open: function (src, alt, title) {
        if (!box) build();
        img.src = src;
        img.alt = alt || '';
        cap.textContent = title || '';
        box.showModal();
      },
      isOpen: function () { return !!box && box.open; },
      onClose: function (fn) { closeHandlers.push(fn); }
    };
  })();

  /* Dots halaman untuk track yang bisa di-scroll (portfolio & achievements).
     1 halaman = selebar track. Jumlah dots dihitung otomatis. */
  function createPager(track, dotsBox, opts) {
    opts = opts || {};
    let pages = 1;

    const gap = function () { return parseFloat(getComputedStyle(track).columnGap) || 16; };
    const pageW = function () { return track.clientWidth + gap(); };
    const maxLeft = function () { return track.scrollWidth - track.clientWidth; };

    function current() {
      if (pages <= 1) return 0;
      if (track.scrollLeft >= maxLeft() - 2) return pages - 1;
      return Math.min(pages - 1, Math.round(track.scrollLeft / pageW()));
    }

    function goTo(i) {
      const n = Math.max(0, Math.min(i, pages - 1));
      track.scrollTo({ left: n * pageW(), behavior: 'smooth' });
    }

    function update() {
      const c = current();
      Array.prototype.forEach.call(dotsBox.children, function (d, i) {
        d.classList.toggle('is-on', i === c);
        d.setAttribute('aria-current', i === c ? 'true' : 'false');
      });
      if (opts.onUpdate) opts.onUpdate(c, pages);
    }

    function build() {
      pages = Math.max(1, Math.ceil((track.scrollWidth + gap()) / pageW() - 0.01));
      dotsBox.innerHTML = '';
      for (let i = 0; i < pages; i++) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'ach-dot';
        d.setAttribute('aria-label', 'Go to page ' + (i + 1));
        d.addEventListener('click', function () { goTo(i); if (opts.onInteract) opts.onInteract(); });
        dotsBox.appendChild(d);
      }
      dotsBox.hidden = pages <= 1;
      if (opts.onBuild) opts.onBuild(pages);
      update();
    }

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', debounce(build, 150));
    window.addEventListener('load', build);

    return { build: build, current: current, goTo: goTo };
  }


  /* =====================================================
     NAVBAR
     ===================================================== */
  function initNav() {
    const header = document.getElementById('top');
    const menu = document.getElementById('menu');
    const links = document.getElementById('links');

    if (header) {
      const onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 10); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (menu && links) {
      const setOpen = function (open) {
        links.classList.toggle('open', open);
        menu.setAttribute('aria-expanded', String(open));
      };
      menu.addEventListener('click', function () { setOpen(!links.classList.contains('open')); });
      links.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    }
  }


  /* =====================================================
     ANIMASI MUNCUL (.rv)
     ===================================================== */
  function initReveal() {
    const els = document.querySelectorAll('.rv');
    if (!hasIO) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (x) {
        if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }


  /* =====================================================
     SCROLL-SPY (menu aktif mengikuti section)
     ===================================================== */
  function initScrollSpy() {
    if (!hasIO) return;
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.links a');

    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (x) {
        if (!x.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('href') === '#' + x.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }


  /* =====================================================
     PORTFOLIO: filter, dots, panah, drag, lightbox, auto-scroll
     ===================================================== */
  function initPortfolio() {
    const track = document.getElementById('pfTrack');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.pf-card'));
    const filters = document.querySelectorAll('.pf-filter');
    const prev = document.getElementById('pfPrev');
    const next = document.getElementById('pfNext');
    const empty = document.getElementById('pfEmpty');
    const dotsBox = document.getElementById('pfDots');

    /* ---------- Waktu interaksi terakhir (untuk auto-scroll) ---------- */
    let lastInteract = 0;
    function touch() { lastInteract = Date.now(); }

    /* ---------- Dots ---------- */
    const pager = dotsBox ? createPager(track, dotsBox, { onInteract: touch }) : null;

    /* ---------- Panah ---------- */
    function step() {
      const card = track.querySelector('.pf-card:not([hidden])');
      if (!card) return 300;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      return card.getBoundingClientRect().width + gap;
    }

    function scrollByCard(dir) {
      track.scrollBy({ left: dir * step(), behavior: 'smooth' });
    }

    function updateArrows() {
      if (!prev || !next) return;
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    }

    if (prev) prev.addEventListener('click', function () { scrollByCard(-1); touch(); });
    if (next) next.addEventListener('click', function () { scrollByCard(1); touch(); });
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);

    /* Panah keyboard saat track difokuskan */
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCard(-1); }
    });

    /* ---------- Filter ---------- */
    function applyFilter(type) {
      let visible = 0;
      cards.forEach(function (card) {
        const show = type === 'all' || card.dataset.type === type;
        card.hidden = !show;
        if (show) visible++;
      });
      filters.forEach(function (btn) {
        const active = btn.dataset.filter === type;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active);
      });
      if (empty) empty.hidden = visible > 0;
      track.scrollTo({ left: 0, behavior: 'auto' });
      updateArrows();
      if (pager) pager.build();      // jumlah dots mengikuti kartu yang tampil
    }

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () { applyFilter(btn.dataset.filter); touch(); });
    });

    /* ---------- Drag dengan mouse (desktop) ---------- */
    let down = false, moved = false, startX = 0, startLeft = 0;

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;     // sentuhan sudah native
      down = true; moved = false;
      startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
    });

    /* ---------- Klik gambar untuk memperbesar ---------- */
    cards.forEach(function (card) {
      const wrap = card.querySelector('.pf-img');
      const img = wrap && wrap.querySelector('img');
      if (!img) return;
      const title = card.querySelector('h3').textContent;

      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', 'Perbesar gambar: ' + title);

      function open() {
        if (moved) { moved = false; return; }    // abaikan klik setelah drag
        if (!wrap.querySelector('img')) return;  // gambar gagal dimuat
        lightbox.open(img.currentSrc || img.src, img.alt, title);
      }
      wrap.addEventListener('click', open);
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

    /* ---------- Gulir otomatis ---------- */
    const AUTO_DELAY = 3500;     // jeda antar geseran (ms)
    const RESUME_DELAY = 5000;   // diam setelah interaksi sebelum jalan lagi (ms)

    let hovering = false;        // kursor / fokus di atas track
    let touching = false;        // jari sedang menyentuh
    let inView = true;           // track terlihat di layar

    function canRun() {
      return !hovering && !touching && inView &&
             !document.hidden && !lightbox.isOpen() && !reduceMotion.matches &&
             Date.now() - lastInteract > RESUME_DELAY;
    }

    function tick() {
      if (!canRun()) return;
      const max = track.scrollWidth - track.clientWidth - 2;
      if (max <= 0) return;                                       // semua kartu sudah muat
      if (track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollByCard(1);
    }
    setInterval(tick, AUTO_DELAY);

    track.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
    track.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; touch(); } });
    track.addEventListener('focusin', function () { hovering = true; });
    track.addEventListener('focusout', function () { hovering = false; touch(); });
    track.addEventListener('touchstart', function () { touching = true; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (ev) {
      track.addEventListener(ev, function () { touching = false; touch(); }, { passive: true });
    });
    ['pointerdown', 'wheel', 'keydown'].forEach(function (ev) {
      track.addEventListener(ev, touch, { passive: true });
    });
    lightbox.onClose(touch);

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.3 }).observe(track);
    }

    /* ---------- Inisialisasi ---------- */
    updateArrows();
    if (pager) pager.build();
  }


  /* =====================================================
     SLIDER SERTIFIKAT (kanan atas About)
     ===================================================== */
  function initAwards() {
    const root = document.querySelector('[data-slider]');
    if (!root) return;

    const track = root.querySelector('.award-track');
    const slides = Array.prototype.slice.call(root.querySelectorAll('.award-slide'));
    const dotsEl = root.querySelector('.award-dots');
    const view = root.querySelector('.award-viewport');
    if (!track || !slides.length) return;

    const AUTO_MS = 5000;
    let i = 0, timer = null, hovering = false, dragged = false;

    /* titik indikator */
    const dots = dotsEl ? slides.map(function (_, n) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'award-dot';
      b.setAttribute('aria-label', 'Slide ' + (n + 1));
      b.addEventListener('click', function () { go(n); start(); });
      dotsEl.appendChild(b);
      return b;
    }) : [];

    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-i * 100) + '%)';
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    }

    /* auto-slide */
    function stop() { clearInterval(timer); timer = null; }
    function start() {
      stop();
      if (hovering || reduceMotion.matches || slides.length < 2) return;
      timer = setInterval(function () {
        if (!lightbox.isOpen() && !document.hidden) go(i + 1);
      }, AUTO_MS);
    }

    const prev = root.querySelector('.prev');
    const next = root.querySelector('.next');
    if (prev) prev.addEventListener('click', function () { go(i - 1); start(); });
    if (next) next.addEventListener('click', function () { go(i + 1); start(); });

    root.addEventListener('mouseenter', function () { hovering = true; stop(); });
    root.addEventListener('mouseleave', function () { hovering = false; start(); });
    lightbox.onClose(start);

    /* swipe */
    if (view) {
      let startX = null;
      view.addEventListener('pointerdown', function (e) { startX = e.clientX; dragged = false; });
      view.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 40) {
          dragged = true;                          // supaya swipe tidak dianggap klik
          go(i + (dx < 0 ? 1 : -1));
          start();
          setTimeout(function () { dragged = false; }, 0);
        }
        startX = null;
      });
      view.addEventListener('pointercancel', function () { startX = null; });
    }

    /* klik gambar -> lightbox */
    slides.forEach(function (s) {
      const img = s.querySelector('img');
      if (!img) return;
      const h = s.querySelector('h3');
      img.addEventListener('click', function () {
        if (dragged) return;
        lightbox.open(img.currentSrc || img.src, img.alt, h ? h.textContent : '');
      });
    });

    go(0);
    start();
  }


  /* =====================================================
     ACHIEVEMENTS (galeri per baris)
     ===================================================== */
  function initAchievements() {
    document.querySelectorAll('.ach-row').forEach(function (row) {
      const track = row.querySelector('.ach-track');
      const dotsBox = row.querySelector('.ach-dots');
      const prev = row.querySelector('.ach-prev');
      const next = row.querySelector('.ach-next');
      if (!track || !dotsBox) return;

      const pager = createPager(track, dotsBox, {
        onBuild: function (pages) { row.classList.toggle('is-single', pages <= 1); },
        onUpdate: function (c, pages) {
          if (prev) prev.disabled = c <= 0;
          if (next) next.disabled = c >= pages - 1;
        }
      });

      if (prev) prev.addEventListener('click', function () { pager.goTo(pager.current() - 1); });
      if (next) next.addEventListener('click', function () { pager.goTo(pager.current() + 1); });

      /* klik foto -> perbesar */
      row.addEventListener('click', function (e) {
        const btn = e.target.closest('.ach-photo');
        if (!btn) return;
        const img = btn.querySelector('img');
        if (!img) return;                          // gambar belum ada
        const cap = btn.closest('.ach-item').querySelector('figcaption b');
        lightbox.open(img.currentSrc || img.src, img.alt, cap ? cap.textContent : '');
      });

      pager.build();
    });
  }


  /* =====================================================
     JALANKAN
     ===================================================== */
  initNav();
  initReveal();
  initScrollSpy();
  initPortfolio();
  initAwards();
  initAchievements();
})();