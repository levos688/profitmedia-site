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
        { id: '22s', ms: 22000 },
        { id: '25s', ms: 25000 },
      ],
    },
    popup_scroll: {
      variants: [
        { id: '60pct', ratio: 0.6 },
        { id: '50pct', ratio: 0.5 },
      ],
    },
  };

  function pickVariant(experiment) {
    var list = CONFIG[experiment].variants;
    return list[Math.floor(Math.random() * list.length)];
  }

  function isActiveVariant(experiment, variant) {
    var list = CONFIG[experiment].variants;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === variant) return true;
    }
    return false;
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
    if (existing) {
      var changed = false;
      Object.keys(CONFIG).forEach(function (experiment) {
        if (!isActiveVariant(experiment, existing[experiment])) {
          existing[experiment] = pickVariant(experiment).id;
          changed = true;
        }
      });
      if (changed) writeAssignments(existing);
      return existing;
    }

    var assignments = {
      sticky_cta: pickVariant('sticky_cta').id,
      popup_delay: pickVariant('popup_delay').id,
      popup_scroll: pickVariant('popup_scroll').id,
    };
    writeAssignments(assignments);
    return assignments;
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function isFacebookAdTraffic() {
    try {
      if (sessionStorage.getItem('donhin_fb_ad') === '1') return true;

      var url = new URL(window.location.href);
      if (url.searchParams.get('fbclid')) return true;

      var utmSource = (url.searchParams.get('utm_source') || '').toLowerCase();
      if (/^ri_\d+$/i.test(utmSource)) return true;

      var utmMedium = (url.searchParams.get('utm_medium') || '').toLowerCase();
      if (
        (utmSource === 'facebook' || utmSource === 'fb' || utmSource === 'meta' || utmSource === 'instagram' || utmSource === 'ig') &&
        (utmMedium === 'paid' || utmMedium === 'cpc' || utmMedium === 'ppc')
      ) {
        return true;
      }

      if (readCookie('_fbc')) return true;
    } catch (e) {}

    return false;
  }

  function markFacebookAdTraffic() {
    if (!isFacebookAdTraffic()) return;
    try {
      sessionStorage.setItem('donhin_fb_ad', '1');
    } catch (e) {}
  }

  markFacebookAdTraffic();

  function getTrackingChannel() {
    return isFacebookAdTraffic() ? 'fb_ads' : 'all';
  }

  function track(experiment, variant, metric) {
    return fetch('/api/ab-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experiment: experiment,
        variant: variant,
        metric: metric,
        channel: getTrackingChannel(),
      }),
    }).catch(function () {});
  }

  /** One request = one KV write, so sticky/popup conversions cannot overwrite each other. */
  function trackEvents(events) {
    return fetch('/api/ab-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: events,
        channel: getTrackingChannel(),
      }),
    }).catch(function () {});
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
    return 22000;
  }

  function scrollRatio(id) {
    for (var i = 0; i < CONFIG.popup_scroll.variants.length; i++) {
      if (CONFIG.popup_scroll.variants[i].id === id) return CONFIG.popup_scroll.variants[i].ratio;
    }
    return 0.6;
  }

  function getScrollDepth() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight - window.innerHeight, 1);
    return window.scrollY / total;
  }

  function initStickyCta(assignments, openPopupFromSticky) {
    var bar = document.getElementById('donhin-sticky-cta');
    var btn = document.getElementById('donhin-sticky-cta-btn');
    if (!bar || !btn) return;

    btn.textContent = stickyLabel(assignments.sticky_cta);
    bar.hidden = false;
    bar.classList.remove('hidden');
    document.body.classList.add('donhin-has-sticky');
    track('sticky_cta', assignments.sticky_cta, 'impression');

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      track('sticky_cta', assignments.sticky_cta, 'click');
      if (typeof openPopupFromSticky === 'function') openPopupFromSticky();
    });
  }

  function initPopup(assignments, openPopup) {
    var delay = delayMs(assignments.popup_delay);
    var ratio = scrollRatio(assignments.popup_scroll);
    var scrollTriggered = false;

    window.setTimeout(function () {
      openPopup('timer');
    }, delay);

    function onScroll() {
      if (scrollTriggered) return;
      if (getScrollDepth() >= ratio) {
        scrollTriggered = true;
        openPopup('scroll');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  window.donhinAb = {
    getAssignments: getAssignments,
    trackConversion: function (formType) {
      var assignments = getAssignments();
      var events = [
        { experiment: 'sticky_cta', variant: assignments.sticky_cta, metric: 'conversion' },
        { experiment: 'popup_delay', variant: assignments.popup_delay, metric: 'conversion' },
        { experiment: 'popup_scroll', variant: assignments.popup_scroll, metric: 'conversion' },
      ];
      var source = normalizeLeadSource(formType);
      if (source) {
        events.push({ experiment: 'lead_source', variant: source, metric: 'conversion' });
      }
      return trackEvents(events);
    },
    trackLeadSource: function (formType, metric) {
      var source = normalizeLeadSource(formType);
      if (!source || !metric) return Promise.resolve();
      return track('lead_source', source, metric);
    },
    trackPopupImpression: function (assignments) {
      return trackEvents([
        { experiment: 'popup_delay', variant: assignments.popup_delay, metric: 'impression' },
        { experiment: 'popup_scroll', variant: assignments.popup_scroll, metric: 'impression' },
      ]);
    },
    initStickyCta: initStickyCta,
    initPopup: initPopup,
  };

  function normalizeLeadSource(formType) {
    if (!formType) return '';
    var map = {
      quiz: 'quiz',
      simple: 'simple',
      'popup-quiz': 'popup_quiz',
      popup_quiz: 'popup_quiz',
      'popup-simple': 'popup_simple',
      popup_simple: 'popup_simple',
      hero_cta: 'hero_cta',
      sticky: 'popup_simple',
    };
    return map[formType] || '';
  }
})();
