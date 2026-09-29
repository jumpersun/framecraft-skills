/* intro-reel.js — the entry page (index.html). Plays the Work Reel ’26 full-screen (with sound when the browser
   allows it, else muted with "tap for sound"), shows skip + sound controls, then an end screen with "enter the site"
   and "watch again". If autoplay is blocked entirely, or the visitor prefers reduced motion, it opens on the same
   screen in "start" mode (play is the lead button). Skip / enter leave through a lime iris into home.html. */
(function () {
  var body = document.body;
  var v = document.getElementById('reel');
  var end = document.querySelector('[data-end]');
  var skip = document.querySelector('[data-skip]');
  var sound = document.querySelector('[data-sound]');
  var soundLabel = document.querySelector('[data-sound-label]');
  var ring = document.querySelector('[data-ring]');
  var wipe = document.querySelector('[data-wipe]');
  var enterBtn = document.querySelector('[data-enter]');
  var replayBtn = document.querySelector('[data-replay]');
  var HOME = 'home.html';
  var RING = 81.68;   // 2πr, r = 13
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var small = (window.matchMedia && matchMedia('(max-width: 900px)').matches) || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  v.src = small ? 'assets/reel/work-reel-26-540.mp4?v=1' : 'assets/reel/work-reel-26.mp4?v=1';

  // split the name into letters for the drop-in (the h1 keeps an aria-label)
  document.querySelectorAll('[data-letters]').forEach(function (el) {
    var s = el.textContent, accent = el.hasAttribute('data-accent-last'); el.textContent = '';
    for (var i = 0; i < s.length; i++) {
      var c = document.createElement('span'); c.className = 'ch' + (accent && i === s.length - 1 ? ' is-accent' : '');
      c.style.setProperty('--i', i); c.textContent = s[i]; c.setAttribute('aria-hidden', 'true'); el.appendChild(c);
    }
  });

  function setSound(on) {
    v.muted = !on;
    body.classList.toggle('sound-on', on); body.classList.toggle('is-muted', !on);
    sound.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Sound on' : 'Sound off';
  }
  function live() { body.dataset.mode = 'playing'; body.classList.add('is-live'); body.classList.remove('is-ended'); setTimeout(function () { body.classList.add('rotate-seen'); }, 6500); }

  function start() {
    v.muted = false;
    var p = v.play();
    if (!p || !p.then) { setSound(!v.muted); live(); return; }
    p.then(function () { setSound(true); live(); }).catch(function () {
      v.muted = true;   // the browser wants a gesture before sound: play muted, offer sound
      v.play().then(function () { setSound(false); live(); }).catch(function () { showEnd('start'); });
    });
  }

  // ---- the end screen ----
  var field = fieldAnim(document.querySelector('[data-field]'));
  function setMode(mode) {
    body.dataset.mode = mode;
    var startMode = mode === 'start';
    document.querySelector('[data-end-kicker]').textContent = startMode ? 'Work Reel ’26 — 84 s' : 'Work Reel ’26 — end of trace';
    document.querySelector('[data-end-status]').textContent = startMode ? 'Ready' : 'Status OK';
    document.querySelectorAll('[data-replay-label]').forEach(function (s) { s.textContent = startMode ? 'Play the reel' : 'Watch again'; });
    document.querySelector('[data-replay-zh]').textContent = startMode ? '播放短片' : '再看一遍';
  }
  function showEnd(mode) {
    setMode(mode);
    body.classList.add('is-ended'); body.classList.remove('is-buffering');
    end.hidden = false; end.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { requestAnimationFrame(function () { end.classList.add('is-on'); }); });
    field.start();
    setTimeout(function () { (mode === 'start' ? replayBtn : enterBtn).focus({ preventScroll: true }); }, 1400);
  }
  function hideEnd() {
    end.classList.remove('is-on'); end.setAttribute('aria-hidden', 'true');
    setTimeout(function () { if (!end.classList.contains('is-on')) { end.hidden = true; field.stop(); } }, 650);
  }

  // ---- leaving: a lime iris from the pressed control ----
  var leaving = false;
  function enter(from) {
    if (leaving) return; leaving = true;
    var r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    wipe.style.setProperty('--x', (r.left + r.width / 2) + 'px'); wipe.style.setProperty('--y', (r.top + r.height / 2) + 'px');
    wipe.classList.add('is-go');
    fadeOut();
    setTimeout(function () { location.href = HOME; }, reduce ? 50 : 820);
  }
  function fadeOut() {   // duck the music as the iris closes
    if (v.paused || v.muted) { v.pause(); return; }
    var vol = v.volume, id = setInterval(function () { vol = Math.max(0, vol - .12); v.volume = vol; if (vol <= 0) { clearInterval(id); v.pause(); } }, 60);
  }

  // ---- wiring ----
  skip.addEventListener('click', function () { enter(skip); });
  enterBtn.addEventListener('click', function (e) { e.preventDefault(); enter(enterBtn); });
  sound.addEventListener('click', function () { setSound(v.muted); });
  v.addEventListener('click', function () { if (v.muted) setSound(true); });
  replayBtn.addEventListener('click', function () {
    hideEnd(); leaving = false; wipe.classList.remove('is-go'); v.volume = 1;
    try { v.currentTime = 0; } catch (e) {}
    setSound(true);   // a click is a gesture: sound is allowed now
    var p = v.play(); if (p && p.catch) p.catch(function () { setSound(false); v.play().catch(function () {}); });
    live();
  });
  v.addEventListener('ended', function () { showEnd('end'); });
  v.addEventListener('error', function () { if (!body.classList.contains('is-ended')) showEnd('start'); replayBtn.hidden = true; });
  v.addEventListener('waiting', function () { if (!body.classList.contains('is-ended')) body.classList.add('is-buffering'); });
  v.addEventListener('playing', function () { body.classList.remove('is-buffering'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); enter(skip); }
    else if ((e.key === 'm' || e.key === 'M') && !body.classList.contains('is-ended')) setSound(v.muted);
  });
  // the skip ring fills with the reel
  (function tick() {
    if (v.duration) ring.style.strokeDashoffset = String(RING * (1 - Math.min(1, v.currentTime / v.duration)));
    requestAnimationFrame(tick);
  })();
  // coming back with the browser's back button (bfcache): reset the exit
  window.addEventListener('pageshow', function (e) { if (e.persisted) { leaving = false; wipe.classList.remove('is-go'); if (!body.classList.contains('is-ended')) showEnd('end'); } });

  // magnetic buttons (fine pointers only)
  if (!reduce && window.matchMedia && matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.rcta').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * .12).toFixed(1) + 'px'); b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * .22).toFixed(1) + 'px'); });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  if (reduce) showEnd('start'); else start();

  // ---- the end screen's background: the reel's particle terrain, as a light 2D dot field ----
  function fieldAnim(cv) {
    var ctx = cv.getContext('2d'), raf = 0, t0 = 0, W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function draw(ts) {
      if (!t0) t0 = ts; var t = (ts - t0) / 1000; ctx.clearRect(0, 0, W, H);
      var cols = 64, rows = 22, hz = H * .52;
      for (var j = 0; j < rows; j++) {
        var z = j / (rows - 1), p = 1 / (1 + z * 3.2), y0 = hz + (H - hz) * (1 - p) * 1.25;
        for (var i = 0; i < cols; i++) {
          var u = i / (cols - 1) - .5, x = W / 2 + u * W * 1.6 * p;
          var h = Math.sin(u * 7 + t * .8) * .5 + Math.sin(z * 6 - t * .6) * .6 + Math.sin((u + z) * 4 + t * .5) * .5;
          var y = y0 - h * 26 * p, a = (.12 + .5 * (1 - z)) * (.55 + .45 * Math.sin(h + 1));
          ctx.fillStyle = 'rgba(241,238,230,' + a.toFixed(3) + ')';
          ctx.fillRect(x, y, 1.6 * p + .6, 1.6 * p + .6);
        }
      }
      raf = requestAnimationFrame(draw);
    }
    return {
      start: function () { if (raf || reduce) return; size(); window.addEventListener('resize', size); raf = requestAnimationFrame(draw); },
      stop: function () { cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', size); },
    };
  }
})();
