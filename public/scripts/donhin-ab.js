(function () {
  var STORAGE_KEY = 'donhin_ab_v1';

  var CONFIG = {
    sticky_cta: {
      variants: [
        { id: 'get_consult', label: 'Получить бесплатную консультацию' },
        { id: 'free_consult', label: 'Бесплатная консультация' },
      ],
    },
    popup_delay: {
      variants: [
        { id: '15s', ms: 15000 },
        { id: '18s', ms: 18000 },
        { id: '22s', ms: 22000 },
      ],
    },
    popup_scroll: {
      variants: [
        { id: '80pct', ratio: 0.8 },
        { id: '60pct', ratio: 0.6 },
      ],
    },
  };

  function pickVariant(experiment) {
    var list = CONFIG[experiment].variants;
    return list[Math.floor(Math.random() * list.length)];
  }

  function readAssignments() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function writeAssignments(assignments) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch (e) {}
  }

  function getAssignments() {
    var existing = readAssignments();
    if (existing) return existing;

    var assignments = {
      sticky_cta: pickVariant('sticky_cta').id,
      popup_delay: pickVariant('popup_delay').id,
      popup_scroll: pickVariant('popup_scroll').id,
    };
    writeAssignments(assignments);
    return assignments;
  }

  function track(experiment, variant, metric) {
    fetch('/api/ab-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment: experiment, variant: variant, metric: metric }),
    }).catch(function () {});
  }

  function trackAll(metric) {
    var assignments = getAssignments();
    track('sticky_cta', assignments.sticky_cta, metric);
    track('popup_delay', assignments.popup_delay, metric);
    track('popup_scroll', assignments.popup_scroll, metric);
  }

  function stickyLabel(id) {
    for (var i = 0; i < CONFIG.sticky_cta.variants.length; i++) {
      if (CONFIG.sticky_cta.variants[i].id === id) return CONFIG.sticky_cta.variants[i].label;
    }
    return CONFIG.sticky_cta.variants[0].label;
  }

  function delayMs(id) {
    for (var i = 0; i < CONFIG.popup_delay.variants.length; i++) {
      if (CONFIG.popup_delay.variants[i].id === id) return CONFIG.popup_delay.variants[i].ms;
    }
    return 15000;
  }

  function scrollRatio(id) {
    for (var i = 0; i < CONFIG.popup_scroll.variants.length; i++) {
      if (CONFIG.popup_scroll.variants[i].id === id) return CONFIG.popup_scroll.variants[i].ratio;
    }
    return 0.8;
  }

  function initStickyCta(assignments) {
    var bar = document.getElementById('donhin-sticky-cta');
    var btn = document.getElementById('donhin-sticky-cta-btn');
    if (!bar || !btn) return;

    btn.textContent = stickyLabel(assignments.sticky_cta);
    bar.hidden = false;
    bar.classList.remove('hidden');
    document.body.classList.add('donhin-has-sticky');
    track('sticky_cta', assignments.sticky_cta, 'impression');

    btn.addEventListener('click', function () {
      track('sticky_cta', assignments.sticky_cta, 'click');
    });
  }

  function initPopup(assignments, openPopup) {
    var delay = delayMs(assignments.popup_delay);
    var ratio = scrollRatio(assignments.popup_scroll);
    var openedByScroll = false;

    window.setTimeout(function () {
      openPopup('timer');
    }, delay);

    function onScroll() {
      var doc = document.documentElement;
      var total = Math.max(doc.scrollHeight - window.innerHeight, 1);
      var depth = window.scrollY / total;
      if (!openedByScroll && depth >= ratio) {
        openedByScroll = true;
        openPopup('scroll');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  window.donhinAb = {
    getAssignments: getAssignments,
    trackConversion: function () {
      var assignments = getAssignments();
      track('sticky_cta', assignments.sticky_cta, 'conversion');
      track('popup_delay', assignments.popup_delay, 'conversion');
      track('popup_scroll', assignments.popup_scroll, 'conversion');
    },
    trackPopupImpression: function (assignments) {
      track('popup_delay', assignments.popup_delay, 'impression');
      track('popup_scroll', assignments.popup_scroll, 'impression');
    },
    initStickyCta: initStickyCta,
    initPopup: initPopup,
  };
})();
