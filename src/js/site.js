(function () {
  var btn = document.querySelector('.menu');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Close' : 'Menu';
  }

  btn.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });

  // Close the menu if the viewport grows past the mobile breakpoint
  window.matchMedia('(min-width: 851px)').addEventListener('change', function (e) {
    if (e.matches) setOpen(false);
  });
})();

// Project filters (projects page)
(function () {
  var bar = document.querySelector('.filters');
  var list = document.getElementById('project-list');
  if (!bar || !list) return;
  var cards = Array.prototype.slice.call(list.querySelectorAll('article'));
  bar.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    var f = btn.getAttribute('data-filter');
    bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    cards.forEach(function (c) {
      var tags = (c.getAttribute('data-tags') || '').split(/\s+/);
      c.hidden = !(f === 'all' || tags.indexOf(f) !== -1);
    });
    var empty = document.getElementById('filter-empty');
    if (empty) {
      var none = cards.every(function (c) { return c.hidden; });
      empty.textContent = btn.textContent.trim() + ' projects to follow.';
      empty.hidden = !none;
    }
  });
})();

// Team bios: "Show less" collapses the details again
document.querySelectorAll('.team .more .less').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var d = btn.closest('details'); d.removeAttribute('open');
    d.querySelector('summary').focus();
  });
});

// Contact form: submit in the background and show the result inline
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = form.querySelector('.form-status');
  var btn = form.querySelector('button[type="submit"]');
  form.elements.ts.value = String(Date.now());
  if (/[?&]error=1/.test(location.search)) show('Sorry, your message could not be sent. Please try again, or email enquiries@battramassociates.co.uk.', true);

  function show(msg, isError) {
    status.textContent = msg;
    status.className = 'form-status' + (isError ? ' error' : '');
    status.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    ['name', 'email', 'message'].forEach(function (n) {
      var el = form.elements[n]; var ok = el.value.trim() !== '' && (n !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok && !bad) bad = el;
    });
    if (bad) { show('Please fill in your name, a valid email address and a message.', true); bad.focus(); return; }

    btn.disabled = true; var label = btn.innerHTML; btn.textContent = 'Sending…';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, message: 'Sorry, something went wrong. Please email enquiries@battramassociates.co.uk.' }; }); })
      .then(function (res) {
        show(res.message, !res.ok);
        if (res.ok) { form.reset(); form.elements.ts.value = String(Date.now()); }
      })
      .catch(function () { show('Sorry, your message could not be sent. Please check your connection, or email enquiries@battramassociates.co.uk.', true); })
      .then(function () { btn.disabled = false; btn.innerHTML = label; status.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  });
})();

// Project photo galleries: arrows, dots and swipe
document.querySelectorAll('[data-gallery]').forEach(function (g) {
  var track = g.querySelector('.track'), dots = g.querySelectorAll('.dots i');
  var prev = g.querySelector('.g-prev'), next = g.querySelector('.g-next');
  function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
  function update() {
    var i = idx(), n = dots.length;
    dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
    prev.disabled = i <= 0; next.disabled = i >= n - 1;
  }
  function go(d) { track.scrollTo({ left: (idx() + d) * track.clientWidth, behavior: 'smooth' }); }
  prev.addEventListener('click', function (e) { e.preventDefault(); go(-1); });
  next.addEventListener('click', function (e) { e.preventDefault(); go(1); });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
  track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); } });
  window.addEventListener('resize', update);
  update();
});

// Project slideshow: click a project with photos to view them full screen
(function () {
  var list = document.getElementById('project-list');
  if (!list) return;
  var cards = Array.prototype.slice.call(list.querySelectorAll('article')).filter(function (c) {
    return c.hasAttribute('data-photos') || c.querySelector('img');
  });
  if (!cards.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<div class="lb-stage"><img alt=""></div>' +
    '<div class="lb-bar"><span class="lb-title"></span><span class="lb-count" aria-live="polite"></span></div>' +
    '<button type="button" class="lb-close" aria-label="Close slideshow">×</button>' +
    '<button type="button" class="lb-prev" aria-label="Previous photo">‹</button>' +
    '<button type="button" class="lb-next" aria-label="Next photo">›</button>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), title = box.querySelector('.lb-title'), count = box.querySelector('.lb-count');
  var bPrev = box.querySelector('.lb-prev'), bNext = box.querySelector('.lb-next'), bClose = box.querySelector('.lb-close');
  var photos = [], i = 0, opener = null;

  function photosFor(card) {
    var d = card.getAttribute('data-photos');
    if (d) return d.split('|').map(function (p) { var x = p.split('::'); return { src: x[0], alt: x[1] || '' }; });
    return Array.prototype.map.call(card.querySelectorAll('img'), function (im) { return { src: im.getAttribute('src'), alt: im.alt }; });
  }
  function show() {
    img.src = photos[i].src; img.alt = photos[i].alt;
    count.textContent = photos.length > 1 ? (i + 1) + ' / ' + photos.length : '';
    bPrev.hidden = bNext.hidden = photos.length < 2;
    var n = new Image(); n.src = photos[(i + 1) % photos.length].src;
  }
  function open(card, start) {
    photos = photosFor(card); i = start || 0; opener = document.activeElement;
    var name = card.querySelector('h3').textContent;
    title.textContent = name; box.setAttribute('aria-label', name + ' photos');
    show(); box.hidden = false; document.body.classList.add('lb-open'); bClose.focus();
  }
  function close() {
    box.hidden = true; document.body.classList.remove('lb-open'); img.removeAttribute('src');
    if (opener && opener.focus) opener.focus();
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
  function go(d) { i = (i + d + photos.length) % photos.length; show(); }

  bPrev.addEventListener('click', function () { go(-1); });
  bNext.addEventListener('click', function () { go(1); });
  bClose.addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lb-stage')) close(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      var f = [bClose, bPrev, bNext].filter(function (b) { return !b.hidden; });
      var k = f.indexOf(document.activeElement);
      e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  });

  cards.forEach(function (card) {
    var n = photosFor(card).length;
    card.classList.add('has-photos');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'view-photos';
    btn.textContent = n > 1 ? 'View ' + n + ' photos' : 'View photo';
    btn.setAttribute('aria-label', 'View ' + card.querySelector('h3').textContent + ' photos');
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(card, 0); });
    card.querySelector('h3').insertAdjacentElement('beforebegin', btn);
    card.addEventListener('click', function (e) {
      if (e.target.closest('.g-prev, .g-next, .view-photos')) return;
      var tr = card.querySelector('.track');
      var start = tr ? Math.round(tr.scrollLeft / tr.clientWidth) : 0;
      open(card, start);
    });
  });

  // Arriving from a featured project link (e.g. /projects/#wigginton) opens its slideshow
  function fromHash() {
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && cards.indexOf(target) !== -1) open(target, 0);
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();
