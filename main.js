// One Way Window Cleaning — alternate design. Year, estimate form (same
// behavior as the live site), scroll reveals, clean-glass wipe.
(function () {
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Estimate form: no server needed. Builds an email with the details filled in.
  var form = document.getElementById('estimate-form');
  var note = document.getElementById('form-note');
  if (!form || !note) return;
  var noteDefault = note.innerHTML;
  var f = form.elements;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = f.namedItem('name').value.trim();
    var phone = f.namedItem('phone').value.trim();
    var nameEl = f.namedItem('name'), phoneEl = f.namedItem('phone');
    [nameEl, phoneEl].forEach(function (el) { el.classList.add('touched'); });
    nameEl.setAttribute('aria-invalid', name ? 'false' : 'true');
    phoneEl.setAttribute('aria-invalid', phone ? 'false' : 'true');
    if (!name || !phone) {
      note.classList.add('is-error');
      note.textContent = !name && !phone
        ? 'Add your name and phone number so Vinson can get back to you.'
        : (!name ? 'Add your name so Vinson can get back to you.'
                 : 'Add your phone number so Vinson can get back to you.');
      (name ? phoneEl : nameEl).focus();
      return;
    }
    note.classList.remove('is-error');
    note.innerHTML = noteDefault;

    var services = Array.prototype.slice.call(form.querySelectorAll('input[name="svc"]:checked'))
      .map(function (el) { return el.value; });
    var lines = [
      'Name: ' + name,
      'Phone: ' + phone,
      'Location: ' + (f.namedItem('where').value.trim() || '-'),
      'Services: ' + (services.length ? services.join(', ') : '-'),
      '',
      f.namedItem('notes').value.trim()
    ];
    var subject = 'Free estimate request: ' + name;
    window.location.href = 'mailto:sochircavinson@gmail.com?subject=' +
      encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  });
})();

// Reveals and the wipe: gated so reduced-motion and no-IntersectionObserver
// visitors simply get the static site.
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* --- scroll reveals */
  if (hasIO && !reduced) {
    var sel = '.sec-head, .svc-row, .step, .faq__item, .stat, .city-row, .wipe, .owner-grid, .form-panel, .needs, .prose-block, .mini-stat, .block__head';
    var candidates = Array.prototype.slice.call(document.querySelectorAll(sel));
    var perParent = {};
    candidates.forEach(function (el) {
      var parent = el.parentNode;
      perParent[parent] = perParent[parent] || 0;
      el.style.setProperty('--rv-delay', Math.min(perParent[parent] * 60, 240) + 'ms');
      perParent[parent]++;
      el.classList.add('rv');
    });
    var rvObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          rvObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    candidates.forEach(function (el) { rvObserver.observe(el); });
    // Fail-open sweep: fast scrolling, anchor jumps and full-page captures can
    // jump past IntersectionObserver's sampled frames. Anything whose top has
    // reached the viewport gets revealed on scroll/resize regardless.
    var sweep = function () {
      candidates.forEach(function (el) {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight + 800) {
          el.classList.add('is-in');
          rvObserver.unobserve(el);
        }
      });
    };
    var sweepQueued = false;
    var queueSweep = function () {
      if (sweepQueued) return;
      sweepQueued = true;
      window.requestAnimationFrame(function () { sweepQueued = false; sweep(); });
    };
    window.addEventListener('scroll', queueSweep, { passive: true });
    window.addEventListener('load', function () { window.setTimeout(sweep, 250); });
    // A capture-style viewport jump (full-page screenshot tools resize the
    // viewport to the whole document) reveals everything at once, instantly.
    var lastH = window.innerHeight;
    window.addEventListener('resize', function () {
      var h = window.innerHeight;
      if (h > lastH * 1.8) {
        candidates.forEach(function (el) {
          el.classList.add('no-anim');
          el.classList.add('is-in');
          rvObserver.unobserve(el);
        });
      } else {
        queueSweep();
      }
      lastH = h;
    });
    // Timers fire even when frame production is throttled: sweep on an
    // interval for the first seconds after load so nothing stays hidden.
    var ticks = 0;
    var iv = window.setInterval(function () {
      sweep();
      ticks++;
      var done = candidates.every(function (el) { return el.classList.contains('is-in'); });
      if (done || ticks > 24) window.clearInterval(iv);
    }, 400);
    sweep();
  }

  /* --- clean-glass wipe */
  Array.prototype.forEach.call(document.querySelectorAll('.wipe'), function (wipe) {
    var input = wipe.querySelector('.wipe__range');
    if (!input) return;
    var interacted = false, rafId = null;
    var setWipe = function (v) { wipe.style.setProperty('--wipe', v + '%'); };
    var cancelSweep = function () { if (rafId) window.cancelAnimationFrame(rafId); rafId = null; };
    input.addEventListener('input', function () {
      interacted = true; cancelSweep(); setWipe(input.value);
    });
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      input.addEventListener(evt, function () { interacted = true; cancelSweep(); }, { passive: true });
    });
    if (!hasIO || reduced) return;
    var sweepObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      sweepObserver.disconnect();
      if (interacted) return;
      var start = null;
      var step = function (ts) {
        if (interacted) return;
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1400, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var v = Math.round((20 + 42 * eased) * 10) / 10;
        setWipe(v); input.value = v;
        if (p < 1) rafId = window.requestAnimationFrame(step);
      };
      rafId = window.requestAnimationFrame(step);
    }, { threshold: 0.35 });
    sweepObserver.observe(wipe);
  });
})();
