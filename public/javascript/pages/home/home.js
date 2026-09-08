(() => {
  const root = document.querySelector('[data-slider]');
  if (!root) return;
  const slides = [...root.querySelectorAll('[data-slide]')];
  const tabs = [...root.querySelectorAll('[data-slider-dot]')];
  const pause = root.querySelector('[data-slider-pause]');
  const status = root.querySelector('[data-slider-status]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer = null, remaining = 7000, started = 0;
  let manualPause = reduced.matches, hovered = false, focused = false, startX = null;
  const stopped = () => manualPause || hovered || focused || document.hidden;

  function schedule() {
    if (timer !== null) {
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (Date.now() - started));
      timer = null;
    }
    root.classList.toggle('is-paused', stopped());
    if (!stopped()) {
      started = Date.now();
      timer = setTimeout(() => { timer = null; show(index + 1, false); }, remaining);
    }
  }
  function show(next, announce = true) {
    const selected = (next + slides.length) % slides.length;
    if (selected === index) return;
    clearTimeout(timer);
    timer = null;
    remaining = 7000;
    index = selected;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === index);
      if (i === index) tab.setAttribute('aria-current', 'true');
      else tab.removeAttribute('aria-current');
    });
    if (announce) status.textContent = index === 0 ? 'کالکشن روزمره' : 'باکس‌های آماده';
    schedule();
  }
  function updatePause() {
    pause.setAttribute('aria-pressed', String(manualPause));
    pause.setAttribute('aria-label', manualPause ? 'پخش اسلایدشو' : 'توقف اسلایدشو');
    pause.innerHTML = manualPause ? '<span aria-hidden="true">▷</span>' : '<span aria-hidden="true">Ⅱ</span>';
    schedule();
  }
  root.querySelector('[data-slider-next]').addEventListener('click', () => show(index + 1));
  root.querySelector('[data-slider-prev]').addEventListener('click', () => show(index - 1));
  tabs.forEach((tab, i) => tab.addEventListener('click', () => show(i)));
  pause.addEventListener('click', () => { manualPause = !manualPause; updatePause(); });
  root.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  root.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) { focused = false; schedule(); }
  });
  root.addEventListener('keydown', event => {
    if (event.target.closest('a,button')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index + 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index - 1); }
  });
  root.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', event => {
    if (startX === null) return;
    const diff = event.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 60) show(index + (diff > 0 ? 1 : -1));
    startX = null;
  }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', event => { manualPause = event.matches; updatePause(); });
  updatePause();
})();
