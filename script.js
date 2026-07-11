/* ============================================================
   Inkwell — Waitlist landing page interactions
   ============================================================ */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function clearErrors() {
    ['hero-error', 'foot-error'].forEach(function (id) {
      var el = $(id);
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
  }

  function showError(msg) {
    ['hero-error', 'foot-error'].forEach(function (id) {
      var el = $(id);
      if (el) { el.textContent = msg; el.style.display = ''; }
    });
  }

  /* ---------- join flow ---------- */

  function setJoined() {
    var heroForm = $('hero-form');
    var heroJoined = $('hero-joined');
    if (heroForm) heroForm.style.display = 'none';
    if (heroJoined) heroJoined.style.display = '';

    var footForm = $('foot-form');
    var footJoined = $('foot-joined');
    if (footForm) footForm.style.display = 'none';
    if (footJoined) footJoined.style.display = '';
  }

  var FORMSPREE_ENDPOINT = 'https://formspree.io/f/xjgqnzdn';
  var submitting = false;

  // Posts the email to Formspree via AJAX. Resolves on success,
  // rejects with a human-readable Error on failure.
  function submitEmail(email) {
    return fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: email, _subject: 'New Inkwell waitlist signup' })
    }).then(function (response) {
      if (response.ok) return;
      return response.json().then(
        function (data) {
          var msg = data && data.errors && data.errors.length
            ? data.errors.map(function (e) { return e.message; }).join(', ')
            : 'Something went wrong — please try again.';
          throw new Error(msg);
        },
        function () { throw new Error('Something went wrong — please try again.'); }
      );
    });
  }

  function join(inputId, btnId) {
    if (submitting) return;
    var el = $(inputId);
    var v = el ? el.value.trim() : '';
    if (!validEmail(v)) {
      showError("That doesn't look like an email");
      if (el) el.focus();
      return;
    }
    clearErrors();

    var btn = btnId ? $(btnId) : null;
    submitting = true;
    if (btn) { btn.disabled = true; btn.style.opacity = '.55'; btn.style.cursor = 'default'; }

    submitEmail(v)
      .then(function () { setJoined(); })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Something went wrong — please try again.');
      })
      .then(function () {
        submitting = false;
        if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = 'pointer'; }
      });
  }

  /* ---------- reveal-on-scroll ---------- */

  function setupReveal() {
    var nodes = document.querySelectorAll('[data-cue]');
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return;

    nodes.forEach(function (n) { n.classList.add('cue-hidden'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('cue-hidden');
          entry.target.classList.add('cue-shown');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- scroll-depth tracking ---------- */

  // Fires a custom event into whatever analytics is present as the visitor
  // passes each depth milestone. Clarity picks these up as taggable events;
  // GA/Plausible/PostHog would too if you swap the provider.
  function track(eventName, percent) {
    try {
      if (window.clarity) {
        window.clarity('event', eventName);
        window.clarity('set', 'max_scroll', String(percent));
      }
      // window.gtag && gtag('event', 'scroll_depth', { percent: percent });
      // window.plausible && plausible(eventName);
      // window.posthog && posthog.capture('scroll_depth', { percent: percent });
    } catch (e) {}
  }

  function setupScrollDepth() {
    var milestones = [25, 50, 75, 100];
    var fired = {};
    var ticking = false;

    function measure() {
      ticking = false;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var pct = Math.min(100, Math.round(((window.pageYOffset || doc.scrollTop) / scrollable) * 100));
      for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (pct >= m && !fired[m]) {
          fired[m] = true;
          track('scrolled-' + m, m);
        }
      }
      if (fired[100]) window.removeEventListener('scroll', onScroll);
    }

    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(measure); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    measure(); // catch short pages already fully visible
  }

  /* ---------- privacy / cookie notice ---------- */

  function setupPrivacyNote() {
    var note = $('privacy-note');
    if (!note) return;

    var acked = false;
    try { acked = localStorage.getItem('inkwell_privacy_ack') === '1'; } catch (e) {}
    if (acked) return; // already dismissed — leave it hidden

    note.hidden = false;

    var ok = $('privacy-ok');
    if (ok) {
      ok.addEventListener('click', function () {
        try { localStorage.setItem('inkwell_privacy_ack', '1'); } catch (e) {}
        note.classList.add('is-leaving');
        setTimeout(function () { note.hidden = true; }, 300);
      });
    }
  }

  /* ---------- wire up ---------- */

  function init() {
    if (!reduce) setupReveal();
    setupScrollDepth();
    setupPrivacyNote();

    var heroBtn = $('join-hero');
    var footBtn = $('join-foot');
    var heroInput = $('wl-hero');
    var footInput = $('wl-foot');

    if (heroBtn) heroBtn.addEventListener('click', function () { join('wl-hero', 'join-hero'); });
    if (footBtn) footBtn.addEventListener('click', function () { join('wl-foot', 'join-foot'); });

    if (heroInput) {
      heroInput.addEventListener('input', clearErrors);
      heroInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); join('wl-hero', 'join-hero'); }
      });
    }
    if (footInput) {
      footInput.addEventListener('input', clearErrors);
      footInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); join('wl-foot', 'join-foot'); }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
