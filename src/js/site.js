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
