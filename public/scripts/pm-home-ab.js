(function () {
  var STORAGE_KEY = 'pm_home_ab_v2';
  var SKIP_KEY = 'pm_ab_skip';

  function isTrackingSkipped() {
    try {
      var params = new URL(window.location.href).searchParams;
      if (params.get('ab_skip') === '1') {
        sessionStorage.setItem(SKIP_KEY, '1');
        return true;
      }
      if (params.get('ab_skip') === '0') {
        sessionStorage.removeItem(SKIP_KEY);
        return false;
      }
      return sessionStorage.getItem(SKIP_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  var CONFIG = {
    hero_copy: {
      variants: [
        {
          id: 'system',
          eyebrow: 'מערכת עסקאות מהפרסום — לא סוכנות רגילה',
          title: 'הליד הכי זול שלכם יכול להיות היקר ביותר',
          subtitle:
            'פרסום, דף נחיתה ו־CRM אישי מתחברים למערכת אחת, כדי לזהות מה מביא פגישות ועסקאות — לא רק לידים.',
          cta: 'קבלו אבחון קמפיין חינם',
          ctaNote: '',
          proofChip: '',
          trustLine: 'עד 46% ירידה בעלות לליד · SKI VIP · 223+ לקוחות',
        },
        {
          id: 'pain',
          eyebrow: 'מערכת עסקאות מהפרסום — לא סוכנות רגילה',
          title: 'הליד הכי זול שלכם יכול להיות היקר ביותר',
          subtitle:
            'מחברים את נתוני הפרסום למה שקורה בשיחות, בפגישות ובעסקאות — כדי להשקיע במה שמתקדם, לא רק במה שנראה טוב בדוח.',
          cta: 'קבלו אבחון קמפיין חינם',
          ctaNote: '',
          proofChip: '',
          trustLine: 'עד 46% ירידה בעלות לליד · SKI VIP · 223+ לקוחות',
        },
      ],
    },
    sticky_cta: {
      variants: [
        { id: 'diagnosis', label: 'קבלו אבחון קמפיין חינם' },
        { id: 'order_system', label: 'הזמנת מערכת' },
        { id: 'start_work', label: 'התחלת עבודה על המערכת' },
      ],
    },
    popup_delay: {
      variants: [
        { id: '20s', ms: 20000 },
        { id: '25s', ms: 25000 },
      ],
    },
    popup_scroll: {
      variants: [
        { id: '50pct', ratio: 0.5 },
        { id: '65pct', ratio: 0.65 },
      ],
    },
    bottom_copy: {
      variants: [
        {
          id: 'diagnosis',
          eyebrow: 'ללא כל התחייבות',
          title: 'השאירו פרטים וקבלו אבחון קמפיין חינם',
          submitLabel: 'קבלו אבחון קמפיין חינם',
        },
        {
          id: 'order_system',
          eyebrow: 'ללא כל התחייבות',
          title: 'השאירו פרטים להתחלת עבודה על המערכת',
          submitLabel: 'הזמנת מערכת',
        },
      ],
    },
    mid_cta: {
      variants: [
        {
          id: 'diagnosis',
          title: 'רוצים לראות כמה אפשר להוציא יותר מאותו תקציב?',
          subtitle: '3 פרטים קצרים · אבחון חינם תוך 24 שעות · בלי התחייבות',
          button: 'קבלו אבחון קמפיין חינם',
        },
        {
          id: 'order_system',
          title: 'מוכנים להריץ מערכת עסקאות מהפרסום?',
          subtitle: '3 פרטים קצרים · שיחת התאמה תוך 24 שעות · בלי הבטחות מכירות',
          button: 'הזמנת מערכת',
        },
      ],
    },
    offer_cta: {
      variants: [
        {
          id: 'diagnosis',
          title: 'הצעד הראשון: אבחון קמפיין חינם',
          items: [
            'איפה אפשר להוציא יותר מאותו תקציב',
            'האם רצים בדיקות אמיתיות — או מסתמכים על תחושה',
            'מה לשפר קודם — תוך 24 שעות, בלי התחייבות',
          ],
          button: 'קבלו אבחון קמפיין חינם',
        },
        {
          id: 'order_system',
          title: 'הצעד הראשון: התחלת עבודה על המערכת',
          items: [
            'מחקר, הצעה מסחרית והקמת בדיקות חכמות',
            'CRM עסקאות ופידבק לפלטפורמות',
            'שיחת התאמה תוך 24 שעות — בלי הבטחות מכירות',
          ],
          button: 'הזמנת מערכת',
        },
      ],
    },
  };

  var allocationByExperiment = null;
  var lastLeadSource = 'simple';
  var popupOpened = false;

  function defaultEqualWeights(experiment) {
    var list = CONFIG[experiment].variants;
    var weights = {};
    for (var i = 0; i < list.length; i++) weights[list[i].id] = 1 / list.length;
    return weights;
  }

  function getWeights(experiment) {
    if (allocationByExperiment && allocationByExperiment[experiment] && allocationByExperiment[experiment].weights) {
      return allocationByExperiment[experiment].weights;
    }
    return defaultEqualWeights(experiment);
  }

  function pickVariant(experiment) {
    var list = CONFIG[experiment].variants;
    var weights = getWeights(experiment);
    var total = 0;
    for (var i = 0; i < list.length; i++) total += Number(weights[list[i].id]) || 0;
    if (!(total > 0)) return list[Math.floor(Math.random() * list.length)];
    var r = Math.random() * total;
    var cursor = 0;
    for (var j = 0; j < list.length; j++) {
      cursor += Number(weights[list[j].id]) || 0;
      if (r <= cursor) return list[j];
    }
    return list[list.length - 1];
  }

  function isActiveVariant(experiment, variant) {
    var list = CONFIG[experiment].variants;
    for (var i = 0; i < list.length; i++) if (list[i].id === variant) return true;
    return false;
  }

  function findVariant(experiment, id) {
    var list = CONFIG[experiment] && CONFIG[experiment].variants;
    if (!list) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || null;
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

  function applyForceOverrides(assignments) {
    try {
      var url = new URL(window.location.href);
      var map = {
        force_hero: 'hero_copy',
        force_sticky: 'sticky_cta',
        force_bottom: 'bottom_copy',
        force_mid: 'mid_cta',
        force_offer: 'offer_cta',
        force_delay: 'popup_delay',
        force_scroll: 'popup_scroll',
      };
      var changed = false;
      Object.keys(map).forEach(function (param) {
        var experiment = map[param];
        var value = (url.searchParams.get(param) || '').trim();
        if (!value || !isActiveVariant(experiment, value)) return;
        if (assignments[experiment] !== value) {
          assignments[experiment] = value;
          changed = true;
        }
      });
      if (changed) writeAssignments(assignments);
    } catch (e) {}
    return assignments;
  }

  function getAssignments() {
    var existing = readAssignments();
    if (existing) {
      var changed = false;
      Object.keys(CONFIG).forEach(function (experiment) {
        if (!existing[experiment] || !isActiveVariant(experiment, existing[experiment])) {
          existing[experiment] = pickVariant(experiment).id;
          changed = true;
        }
      });
      if (changed) writeAssignments(existing);
      return applyForceOverrides(existing);
    }
    var assignments = {};
    Object.keys(CONFIG).forEach(function (experiment) {
      assignments[experiment] = pickVariant(experiment).id;
    });
    writeAssignments(assignments);
    return applyForceOverrides(assignments);
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function isFacebookAdTraffic() {
    try {
      if (sessionStorage.getItem('pm_home_fb_ad') === '1') return true;
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
      sessionStorage.setItem('pm_home_fb_ad', '1');
    } catch (e) {}
  }

  markFacebookAdTraffic();

  function getTrackingChannel() {
    return isFacebookAdTraffic() ? 'fb_ads' : 'all';
  }

  function track(experiment, variant, metric) {
    if (isTrackingSkipped()) return Promise.resolve();
    return fetch('/api/home-ab-track', {
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

  function trackEvents(events) {
    if (isTrackingSkipped()) return Promise.resolve();
    if (!events || !events.length) return Promise.resolve();
    return fetch('/api/home-ab-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: events,
        channel: getTrackingChannel(),
      }),
    }).catch(function () {});
  }

  function setText(el, value) {
    if (el && typeof value === 'string') el.textContent = value;
  }

  function applyBottomCopy(variantId) {
    var copy = findVariant('bottom_copy', variantId) || CONFIG.bottom_copy.variants[0];
    setText(document.querySelector('[data-ab-bottom-eyebrow]'), copy.eyebrow);
    setText(document.querySelector('[data-ab-bottom-title]'), copy.title);
    setText(document.querySelector('[data-ab-bottom-submit]'), copy.submitLabel);
    return copy;
  }

  function applyMidCta(variantId) {
    var copy = findVariant('mid_cta', variantId) || CONFIG.mid_cta.variants[0];
    setText(document.querySelector('[data-ab-mid-title]'), copy.title);
    setText(document.querySelector('[data-ab-mid-subtitle]'), copy.subtitle);
    setText(document.querySelector('[data-ab-mid-button]'), copy.button);
    return copy;
  }

  function applyOfferCta(variantId) {
    var copy = findVariant('offer_cta', variantId) || CONFIG.offer_cta.variants[0];
    setText(document.querySelector('[data-ab-offer-title]'), copy.title);
    setText(document.querySelector('[data-ab-offer-button]'), copy.button);
    var list = document.querySelector('[data-ab-offer-items]');
    if (list && copy.items) {
      var items = list.querySelectorAll('li span:last-child');
      for (var i = 0; i < items.length && i < copy.items.length; i++) {
        setText(items[i], copy.items[i]);
      }
    }
    return copy;
  }

  function applySticky(variantId) {
    var copy = findVariant('sticky_cta', variantId) || CONFIG.sticky_cta.variants[0];
    setText(document.querySelector('[data-ab-sticky-label]'), copy.label);
    return copy;
  }

  function applyHeroCopy(variantId) {
    var copy = findVariant('hero_copy', variantId) || CONFIG.hero_copy.variants[0];
    setText(document.querySelector('[data-ab-hero-eyebrow]'), copy.eyebrow);
    setText(document.querySelector('[data-ab-hero-title]'), copy.title);
    setText(document.querySelector('[data-ab-hero-subtitle]'), copy.subtitle);
    setText(document.querySelector('[data-ab-hero-proof]'), copy.proofChip);
    setText(document.querySelector('[data-ab-hero-trust]'), copy.trustLine);
    setText(document.querySelector('[data-ab-hero-cta]'), copy.cta);
    setText(document.querySelector('[data-ab-hero-note]'), copy.ctaNote);
    return copy;
  }

  function applyAll(assignments) {
    applyHeroCopy(assignments.hero_copy);
    applySticky(assignments.sticky_cta);
    applyBottomCopy(assignments.bottom_copy);
    applyMidCta(assignments.mid_cta);
    applyOfferCta(assignments.offer_cta);
  }

  function delayMs(id) {
    var v = findVariant('popup_delay', id);
    return v && v.ms ? v.ms : 20000;
  }

  function scrollRatio(id) {
    var v = findVariant('popup_scroll', id);
    return v && v.ratio ? v.ratio : 0.5;
  }

  function getScrollDepth() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight - window.innerHeight, 1);
    return window.scrollY / total;
  }

  function openHomePopup(reason) {
    var popup = document.getElementById('pm-home-popup');
    if (!popup) return;

    if (reason !== 'sticky') {
      if (popupOpened) return;
      try {
        if (sessionStorage.getItem('pm_home_popup_auto_seen') === '1') return;
      } catch (e) {}
    }

    var mode = reason === 'sticky' ? 'simple' : 'quiz';
    var popupEvents = [];
    if (reason === 'timer' || reason === 'scroll') {
      try {
        sessionStorage.setItem('pm_home_popup_auto_seen', '1');
      } catch (e2) {}
      popupEvents.push(
        { experiment: 'popup_delay', variant: getAssignments().popup_delay, metric: 'impression' },
        { experiment: 'popup_scroll', variant: getAssignments().popup_scroll, metric: 'impression' },
      );
    }

    popupOpened = true;
    popup.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      popup.classList.add('pm-home-popup--open');
    });

    popup.dataset.mode = mode;
    var quizStep = popup.querySelector('[data-pm-popup-quiz]');
    var formStep = popup.querySelector('[data-pm-popup-form]');
    if (mode === 'quiz') {
      if (quizStep) quizStep.hidden = false;
      if (formStep) formStep.hidden = true;
      lastLeadSource = 'popup_quiz';
      popupEvents.push({ experiment: 'lead_source', variant: 'popup_quiz', metric: 'impression' });
    } else {
      if (quizStep) quizStep.hidden = true;
      if (formStep) formStep.hidden = false;
      lastLeadSource = reason === 'sticky' ? 'sticky' : 'popup_simple';
      popupEvents.push({ experiment: 'lead_source', variant: lastLeadSource, metric: 'impression' });
      if (submitLabelSync) submitLabelSync();
    }
    if (popupEvents.length) trackEvents(popupEvents);

    function submitLabelSync() {
      var title = popup.querySelector('[data-pm-popup-form-title]');
      var submit = document.getElementById('pm-home-popup-submit');
      var sticky = findVariant('sticky_cta', getAssignments().sticky_cta);
      if (title) {
        title.textContent =
          sticky && (sticky.id === 'order_system' || sticky.id === 'start_work')
            ? 'השאירו פרטים להזמנת המערכת'
            : 'השאירו פרטים לאבחון חינם';
      }
      if (submit && sticky) setText(submit, sticky.label);
    }
  }

  function closeHomePopup() {
    var popup = document.getElementById('pm-home-popup');
    if (!popup) return;
    popup.classList.remove('pm-home-popup--open');
    window.setTimeout(function () {
      popup.hidden = true;
      document.body.style.overflow = '';
      popupOpened = false;
    }, 250);
  }

  function initSticky(assignments) {
    var btn = document.querySelector('[data-ab-sticky-label]');
    var bar = document.querySelector('.sticky-cta');
    if (!btn || !bar) return;
    applySticky(assignments.sticky_cta);
    btn.addEventListener('click', function () {
      track('sticky_cta', assignments.sticky_cta, 'click');
      lastLeadSource = 'sticky';
      openHomePopup('sticky');
    });
  }

  function initCopyImpressions(assignments) {
    trackEvents([
      { experiment: 'hero_copy', variant: assignments.hero_copy, metric: 'impression' },
      { experiment: 'sticky_cta', variant: assignments.sticky_cta, metric: 'impression' },
      { experiment: 'bottom_copy', variant: assignments.bottom_copy, metric: 'impression' },
      { experiment: 'mid_cta', variant: assignments.mid_cta, metric: 'impression' },
      { experiment: 'offer_cta', variant: assignments.offer_cta, metric: 'impression' },
      { experiment: 'lead_source', variant: 'simple', metric: 'impression' },
    ]);
  }

  function initTriggers(assignments) {
    var delay = delayMs(assignments.popup_delay);
    var ratio = scrollRatio(assignments.popup_scroll);
    var scrollTriggered = false;

    window.setTimeout(function () {
      openHomePopup('timer');
    }, delay);

    function onScroll() {
      if (scrollTriggered) return;
      if (getScrollDepth() >= ratio) {
        scrollTriggered = true;
        openHomePopup('scroll');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  function wireLeadSources() {
    document.querySelectorAll('[data-ab-open="hero"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var a = getAssignments();
        track('hero_copy', a.hero_copy, 'click');
        lastLeadSource = 'hero_cta';
      });
    });
    document.querySelectorAll('[data-ab-open="mid"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var a = getAssignments();
        track('mid_cta', a.mid_cta, 'click');
        lastLeadSource = 'mid_cta';
      });
    });
    document.querySelectorAll('[data-ab-open="offer"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var a = getAssignments();
        track('offer_cta', a.offer_cta, 'click');
        lastLeadSource = 'offer_cta';
      });
    });
  }

  var HYBRID_REROLL_MAX_WEIGHT = 0.15;

  function rebalanceAssignmentsIfNeeded() {
    if (!allocationByExperiment) return;
    var existing = readAssignments();
    if (!existing) return;
    var changed = false;
    Object.keys(CONFIG).forEach(function (experiment) {
      var alloc = allocationByExperiment[experiment];
      if (!alloc || !alloc.weights || !existing[experiment]) return;
      var weight = Number(alloc.weights[existing[experiment]]);
      if (!(weight >= 0) || weight > HYBRID_REROLL_MAX_WEIGHT) return;
      var flagKey = 'pm_home_rebalance_' + experiment + '_' + (alloc.mode || 'x') + '_' + (alloc.leader || 'none');
      try {
        if (localStorage.getItem(flagKey) === '1') return;
        existing[experiment] = pickVariant(experiment).id;
        localStorage.setItem(flagKey, '1');
        changed = true;
      } catch (e) {}
    });
    if (changed) writeAssignments(existing);
  }

  function loadAllocation() {
    return fetch('/api/home-ab-allocate', { credentials: 'same-origin' })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok && data.experiments) {
          allocationByExperiment = data.experiments;
          rebalanceAssignmentsIfNeeded();
        }
        return allocationByExperiment;
      })
      .catch(function () {
        return null;
      });
  }

  function trackConversion(sourceOverride) {
    var assignments = getAssignments();
    var source = sourceOverride || lastLeadSource || 'simple';
    var events = [
      { experiment: 'hero_copy', variant: assignments.hero_copy, metric: 'conversion' },
      { experiment: 'sticky_cta', variant: assignments.sticky_cta, metric: 'conversion' },
      { experiment: 'popup_delay', variant: assignments.popup_delay, metric: 'conversion' },
      { experiment: 'popup_scroll', variant: assignments.popup_scroll, metric: 'conversion' },
      { experiment: 'bottom_copy', variant: assignments.bottom_copy, metric: 'conversion' },
      { experiment: 'mid_cta', variant: assignments.mid_cta, metric: 'conversion' },
      { experiment: 'offer_cta', variant: assignments.offer_cta, metric: 'conversion' },
      { experiment: 'lead_source', variant: source, metric: 'conversion' },
    ];
    return trackEvents(events);
  }

  window.pmHomeAb = {
    ready: loadAllocation(),
    CONFIG: CONFIG,
    getAssignments: getAssignments,
    applyAll: applyAll,
    findVariant: findVariant,
    trackConversion: trackConversion,
    setLeadSource: function (source) {
      lastLeadSource = source || lastLeadSource;
    },
    getLeadSource: function () {
      return lastLeadSource;
    },
    openPopup: openHomePopup,
    closePopup: closeHomePopup,
    init: function () {
      var assignments = getAssignments();
      applyAll(assignments);
      var previewMode = false;
      try {
        var path = window.location.pathname || '';
        previewMode =
          path.indexOf('/home/ab-preview') !== -1 ||
          new URL(window.location.href).searchParams.get('ab_preview') === '1';
      } catch (e) {}
      if (previewMode) {
        initSticky(assignments);
        wireLeadSources();
        return;
      }
      initSticky(assignments);
      initCopyImpressions(assignments);
      initTriggers(assignments);
      wireLeadSources();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.pmHomeAb.ready.then(function () {
        window.pmHomeAb.init();
      });
    });
  } else {
    window.pmHomeAb.ready.then(function () {
      window.pmHomeAb.init();
    });
  }
})();
