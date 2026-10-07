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
