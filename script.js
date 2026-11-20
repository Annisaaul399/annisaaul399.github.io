(function(){
  var hd=document.getElementById('top'),menu=document.getElementById('menu'),links=document.getElementById('links');
  function sc(){hd.classList.toggle('scrolled',window.scrollY>10)}
  sc();window.addEventListener('scroll',sc,{passive:true});
  menu.addEventListener('click',function(){var o=links.classList.toggle('open');menu.setAttribute('aria-expanded',o)});
  links.addEventListener('click',function(e){if(e.target.tagName==='A'){links.classList.remove('open');menu.setAttribute('aria-expanded',false)}});
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12});
    els.forEach(function(el){io.observe(el)});
  }else{els.forEach(function(el){el.classList.add('in')})}
  var secs=document.querySelectorAll('main section[id]'),as=document.querySelectorAll('.links a');
  if('IntersectionObserver' in window){
    var so=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){as.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+x.target.id)})}})},{rootMargin:'-45% 0px -50% 0px'});
    secs.forEach(function(s){so.observe(s)});
  }
})();

/* ================= Portfolio: filter, slider, lightbox, auto-scroll ================= */
(function () {
  const track = document.getElementById('pfTrack');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.pf-card'));
  const filters = document.querySelectorAll('.pf-filter');
  const prev = document.getElementById('pfPrev');
  const next = document.getElementById('pfNext');
  const empty = document.getElementById('pfEmpty');

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
    empty.hidden = visible > 0;
    track.scrollTo({ left: 0, behavior: 'auto' });
    updateArrows();
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () { applyFilter(btn.dataset.filter); });
  });

  /* ---------- Tombol panah ---------- */
  function step() {
    const card = track.querySelector('.pf-card:not([hidden])');
    if (!card) return 300;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    return card.getBoundingClientRect().width + gap;
  }

  function updateArrows() {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
    updateProgress();
  }

  prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);

  /* Panah keyboard saat track difokuskan */
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });

  /* ---------- Drag dengan mouse (desktop) ---------- */
  let down = false, startX = 0, startLeft = 0, moved = false;

  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return; // sentuhan sudah native
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

  /* ---------- Lightbox: klik gambar untuk memperbesar ---------- */
  const box = document.createElement('dialog');
  box.className = 'pf-lightbox';
  box.setAttribute('aria-label', 'Pratinjau gambar');
  box.innerHTML =
    '<button class="pf-lightbox-close" aria-label="Tutup">&#10005;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(box);

  const boxImg = box.querySelector('img');
  const boxCap = box.querySelector('figcaption');

  function openBox(img, title) {
    boxImg.src = img.currentSrc || img.src;
    boxImg.alt = img.alt;
    boxCap.textContent = title;
    box.showModal();
  }

  cards.forEach(function (card) {
    const wrap = card.querySelector('.pf-img');
    const img = wrap && wrap.querySelector('img');
    if (!img) return;
    const title = card.querySelector('h3').textContent;

    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', 'Perbesar gambar: ' + title);

    function open() {
      if (moved) { moved = false; return; }   // abaikan klik setelah drag
      if (!wrap.querySelector('img')) return;  // gambar gagal dimuat
      openBox(img, title);
    }
    wrap.addEventListener('click', open);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  box.querySelector('.pf-lightbox-close').addEventListener('click', function () { box.close(); });
  box.addEventListener('click', function (e) {
    if (e.target === box) box.close(); // klik area gelap menutup
  });

  /* ---------- Gulir otomatis ---------- */
  const AUTO_DELAY = 3500;    // jeda antar geseran (ms) - ubah sesuai selera
  const RESUME_DELAY = 5000;  // berapa lama diam setelah disentuh sebelum jalan lagi (ms)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let userPaused = false;   // dijeda lewat tombol
  let hovering = false;     // kursor / fokus di atas track
  let touching = false;     // jari sedang menyentuh
  let inView = true;        // track terlihat di layar
  let lastInteract = 0;     // waktu interaksi terakhir

  function touch() { lastInteract = Date.now(); }

  function canRun() {
    return !userPaused && !hovering && !touching && inView &&
           !document.hidden && !box.open && !reduceMotion.matches &&
           Date.now() - lastInteract > RESUME_DELAY;
  }

  function tick() {
    if (!canRun()) return;
    const max = track.scrollWidth - track.clientWidth - 2;
    if (max <= 0) return; // semua kartu sudah muat, tidak perlu geser
    if (track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: 'smooth' }); // ulang dari awal
    else track.scrollBy({ left: step(), behavior: 'smooth' });
  }

  setInterval(tick, AUTO_DELAY);

  /* Berhenti saat disentuh / di-hover / difokus */
  track.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
  track.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; touch(); } });
  track.addEventListener('focusin', function () { hovering = true; });
  track.addEventListener('focusout', function () { hovering = false; touch(); });
  track.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  track.addEventListener('touchend', function () { touching = false; touch(); }, { passive: true });
  track.addEventListener('touchcancel', function () { touching = false; touch(); }, { passive: true });
  ['pointerdown', 'wheel', 'keydown'].forEach(function (ev) {
    track.addEventListener(ev, touch, { passive: true });
  });
  prev.addEventListener('click', touch);
  next.addEventListener('click', touch);
  filters.forEach(function (btn) { btn.addEventListener('click', touch); });
  box.addEventListener('close', touch);

  /* Hanya jalan saat bagian portfolio terlihat */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.3 }).observe(track);
  }

  // /* Tombol jeda / putar (untuk aksesibilitas) */
  // if (!reduceMotion.matches) {
  //   const toggle = document.createElement('button');
  //   toggle.className = 'pf-arrow';
  //   toggle.type = 'button';
  //   function label() {
  //     toggle.innerHTML = userPaused ? '&#9654;' : '&#10074;&#10074;';
  //     toggle.setAttribute('aria-label', userPaused ? 'Putar geser otomatis' : 'Jeda geser otomatis');
  //     toggle.style.fontSize = userPaused ? '.9rem' : '.75rem';
  //   }
  //   toggle.addEventListener('click', function () { userPaused = !userPaused; label(); });
  //   label();
  //   prev.parentNode.insertBefore(toggle, prev);
  // }

  /* ---------- Indikator scroll kustom ---------- */
  const bar = document.createElement('div');
  bar.className = 'pf-progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML =
    '<div class="pf-rail"><div class="pf-thumb"></div></div>' +
    '<span class="pf-count"></span>';
  track.parentNode.insertBefore(bar, track.nextSibling);

  const rail = bar.querySelector('.pf-rail');
  const thumb = bar.querySelector('.pf-thumb');
  const count = bar.querySelector('.pf-count');

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateProgress() {
    const max = track.scrollWidth - track.clientWidth;
    bar.hidden = max <= 2;                       // sembunyikan jika semua kartu muat
    if (bar.hidden) return;

    const widthPct = Math.max((track.clientWidth / track.scrollWidth) * 100, 12);
    const p = Math.min(1, Math.max(0, track.scrollLeft / max));
    thumb.style.width = widthPct + '%';
    thumb.style.left = (p * (100 - widthPct)) + '%';

    const total = cards.filter(function (c) { return !c.hidden; }).length;
    const idx = p > 0.98 ? total : Math.min(total, Math.round(track.scrollLeft / step()) + 1);
    count.innerHTML = '<b>' + pad(idx) + '</b> / ' + pad(total);
  }

  /* Klik atau drag rel untuk berpindah */
  let seeking = false;
  function seek(e) {
    const r = rail.getBoundingClientRect();
    const tw = thumb.getBoundingClientRect().width;
    const p = Math.min(1, Math.max(0, (e.clientX - r.left - tw / 2) / (r.width - tw)));
    track.scrollLeft = p * (track.scrollWidth - track.clientWidth);
  }
  rail.addEventListener('pointerdown', function (e) {
    seeking = true;
    rail.setPointerCapture(e.pointerId);
    track.classList.add('is-dragging');
    touch();
    seek(e);
  });
  rail.addEventListener('pointermove', function (e) { if (seeking) seek(e); });
  function endSeek() {
    if (!seeking) return;
    seeking = false;
    track.classList.remove('is-dragging');       // scroll-snap kembali aktif dan merapikan posisi
    touch();
  }
  rail.addEventListener('pointerup', endSeek);
  rail.addEventListener('pointercancel', endSeek);

  updateArrows();
})();