/* One invitation per page load, including refresh; no persistent dismissal. */
(function () {
  var entry = document.querySelector('.roadmap-entry');
  if (!entry) return;
  var details = entry.parentElement;
  var observer;
  var finished = false;

  function finish() {
    finished = true;
    entry.classList.remove('is-inviting');
    if (observer) observer.disconnect();
  }

  function play() {
    if (observer) observer.disconnect();
    if (!finished && !details.open) entry.classList.add('is-inviting');
  }

  entry.addEventListener('animationend', function (event) {
    if (event.target === entry && event.animationName === 'roadmap-invite-glow') finish();
  });
  entry.addEventListener('click', finish);
  details.addEventListener('toggle', function () {
    if (details.open) finish();
  });

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;
  reducedMotion.addEventListener('change', function (event) {
    if (event.matches) finish();
  });
  // On small screens, wait until the invitation is actually visible.
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (item) { return item.isIntersecting; })) play();
    }, { threshold: 0.5 });
    observer.observe(entry);
  } else {
    play();
  }
})();
