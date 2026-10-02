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
  });
})();

// Team bios: "Show less" collapses the details again
document.querySelectorAll('.team .more .less').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var d = btn.closest('details'); d.removeAttribute('open');
    d.querySelector('summary').focus();
  });
});
