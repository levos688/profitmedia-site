(function () {
  var SKIP_KEY = 'pm_ab_skip';
  var pageRoot = document.querySelector('[data-lp-keyword]');
  var pageSlug = pageRoot && pageRoot.dataset.lpKeyword ? pageRoot.dataset.lpKeyword : '';
  var pagePrefix =
    pageSlug === 'digital-advertising-agency'
      ? 'agency'
      : pageSlug === 'digital-advertising-office'
        ? 'office'
        : '';
  if (!pagePrefix) return;

  var STORAGE_KEY = 'pm_lp_ab_v2_' + pagePrefix;
  var allocationByExperiment = null;
  var popupOpened = false;
  var autoPopupExposed = false;
  var lastLeadSource = 'inline_form';

  var CTA_VARIANTS =
    pagePrefix === 'agency'
      ? [
          { id: 'diagnosis', label: 'קבלו אבחון קמפיין חינם' },
          { id: 'deal_map', label: 'קבלו מפת הזדמנויות לעסקאות' },
        ]
      : [
          { id: 'diagnosis', label: 'קבלו אבחון קמפיין חינם' },
          { id: 'media_plan', label: 'קבלו תוכנית פרסום ממוקדת' },
        ];

  var CONFIG = {
    page_order: [
      { id: 'proof_first' },
      { id: 'mechanism_first' },
    ],
    cta_copy: CTA_VARIANTS,
    popup_mode: [
      { id: 'quiz' },
      { id: 'direct' },
    ],
    popup_trigger: [
      { id: 'time_30s' },
      { id: 'scroll_50pct' },
      { id: 'exit_intent' },
    ],
  };

  function experimentName(slot) {
    return pagePrefix + '_' + slot;
  }

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

  function isGoogleAdsTraffic() {
    try {
      if (sessionStorage.getItem('pm_lp_google_ad') === '1') return true;
      var url = new URL(window.location.href);
      if (url.searchParams.get('gclid') || url.searchParams.get('wbraid') || url.searchParams.get('gbraid')) {
        sessionStorage.setItem('pm_lp_google_ad', '1');
        return true;
      }
      var source = (url.searchParams.get('utm_source') || '').toLowerCase();
      var medium = (url.searchParams.get('utm_medium') || '').toLowerCase();
      if (
        (source === 'google' || source === 'google_ads' || source === 'adwords') &&
        (medium === 'cpc' || medium === 'ppc' || medium === 'paid' || medium === 'paid_search')
      ) {
        sessionStorage.setItem('pm_lp_google_ad', '1');
        return true;
      }
    } catch (e) {}
    return false;
  }

  function trackEvents(events) {
    if (isTrackingSkipped() || !events || !events.length) return Promise.resolve();
    return fetch('/api/lp-ab-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: events,
        channel: isGoogleAdsTraffic() ? 'google_ads' : 'all',
      }),
      keepalive: true,
    }).catch(function () {});
  }

  function readAssignments() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAssignments(assignments) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch (e) {}
  }

  function variantExists(slot, id) {
    return CONFIG[slot].some(function (variant) {
      return variant.id === id;
    });
  }

  function weightsFor(slot) {
    var allocation = allocationByExperiment && allocationByExperiment[experimentName(slot)];
    if (allocation && allocation.weights) return allocation.weights;
    var equal = {};
    CONFIG[slot].forEach(function (variant) {
      equal[variant.id] = 1 / CONFIG[slot].length;
    });
    return equal;
  }

  function pickVariant(slot) {
    var variants = CONFIG[slot];
    var weights = weightsFor(slot);
    var total = variants.reduce(function (sum, variant) {
      return sum + (Number(weights[variant.id]) || 0);
    }, 0);
    if (!(total > 0)) return variants[Math.floor(Math.random() * variants.length)].id;
    var target = Math.random() * total;
    var cursor = 0;
    for (var i = 0; i < variants.length; i++) {
      cursor += Number(weights[variants[i].id]) || 0;
      if (target <= cursor) return variants[i].id;
    }
    return variants[variants.length - 1].id;
  }

  function forceAssignments(assignments) {
    try {
      var params = new URL(window.location.href).searchParams;
      var forceMap = {
        force_order: 'page_order',
        force_cta: 'cta_copy',
        force_popup: 'popup_mode',
        force_trigger: 'popup_trigger',
      };
      Object.keys(forceMap).forEach(function (param) {
        var slot = forceMap[param];
        var value = params.get(param) || '';
        if (variantExists(slot, value)) assignments[slot] = value;
      });
    } catch (e) {}
    return assignments;
  }

  function getAssignments() {
    var assignments = readAssignments();
    Object.keys(CONFIG).forEach(function (slot) {
      if (!variantExists(slot, assignments[slot])) assignments[slot] = pickVariant(slot);
    });
    forceAssignments(assignments);
    writeAssignments(assignments);
    return assignments;
  }

  function rebalanceAssignments() {
    if (!allocationByExperiment) return;
    var assignments = readAssignments();
    var changed = false;
    Object.keys(CONFIG).forEach(function (slot) {
      var allocation = allocationByExperiment[experimentName(slot)];
      if (!allocation || !allocation.weights || !assignments[slot]) return;
      var weight = Number(allocation.weights[assignments[slot]]);
      if (!(weight >= 0) || weight > 0.2) return;
      var flag = STORAGE_KEY + '_rebalance_' + slot + '_' + (allocation.leader || 'equal');
      try {
        if (localStorage.getItem(flag) === '1') return;
        assignments[slot] = pickVariant(slot);
        localStorage.setItem(flag, '1');
        changed = true;
      } catch (e) {}
    });
    if (changed) writeAssignments(assignments);
  }

  function findVariant(slot, id) {
    if (slot === 'sticky_cta') slot = 'cta_copy';
    var variants = CONFIG[slot] || [];
    return (
      variants.find(function (variant) {
        return variant.id === id;
      }) ||
      variants[0] ||
      null
    );
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  function applyAssignments(assignments) {
    document.documentElement.dataset.pmLpOrder = assignments.page_order;
    document.documentElement.dataset.pmLpReady = '1';
    var cta = findVariant('cta_copy', assignments.cta_copy);
    if (cta) {
      setText('[data-ab-hero-cta]', cta.label);
      setText('[data-ab-offer-button]', cta.label);
      setText('[data-ab-sticky-label]', cta.label);
      setText('[data-ab-bottom-submit]', cta.label);
    }
  }

  function popupCopy() {
    return pagePrefix === 'agency'
      ? {
          question: 'מה הכי חשוב לכם לקבל מסוכנות הפרסום?',
          answers: [
            ['Deals', 'יותר פגישות ועסקאות'],
            ['Transparency', 'לראות מה באמת עובד'],
            ['Quality', 'לשפר את איכות הלידים'],
            ['Cost', 'להוריד עלות בלי לפגוע באיכות'],
          ],
          directTitle: 'בואו נבדוק איך הסוכנות יכולה לייצר יותר עסקאות',
        }
      : {
          question: 'מה אתם רוצים לשפר בפרסום הדיגיטלי?',
          answers: [
            ['Plan', 'תוכנית פרסום ברורה'],
            ['Deals', 'יותר פגישות ועסקאות'],
            ['Transparency', 'שליטה מלאה בנתונים'],
            ['Cost', 'ניצול טוב יותר של התקציב'],
          ],
          directTitle: 'קבלו תוכנית ממוקדת לשיפור הפרסום',
        };
  }

  function preparePopup(mode) {
    var popup = document.getElementById('pm-home-popup');
    if (!popup) return;
    var copy = popupCopy();
    var question = popup.querySelector('.pm-home-popup__question');
    if (question) question.textContent = copy.question;
    popup.querySelectorAll('[data-pm-quiz-answer]').forEach(function (button, index) {
      if (!copy.answers[index]) return;
      button.setAttribute('data-pm-quiz-answer', copy.answers[index][0]);
      button.textContent = copy.answers[index][1];
    });
    var quiz = popup.querySelector('[data-pm-popup-quiz]');
    var form = popup.querySelector('[data-pm-popup-form]');
    var formTitle = popup.querySelector('[data-pm-popup-form-title]');
    if (mode === 'quiz') {
      if (quiz) quiz.hidden = false;
      if (form) form.hidden = true;
    } else {
      if (quiz) quiz.hidden = true;
      if (form) form.hidden = false;
      if (formTitle) formTitle.textContent = copy.directTitle;
    }
    var submit = document.getElementById('pm-home-popup-submit');
    var assignments = getAssignments();
    var cta = findVariant('cta_copy', assignments.cta_copy);
    if (submit && cta) submit.textContent = cta.label;
  }

  function openPopup(reason, source) {
    var popup = document.getElementById('pm-home-popup');
    if (!popup || popupOpened) return;
    try {
      if (reason === 'auto' && sessionStorage.getItem('pm_lp_popup_seen_' + pagePrefix) === '1') return;
    } catch (e) {}

    var assignments = getAssignments();
    var mode = reason === 'auto' ? assignments.popup_mode : 'direct';
    lastLeadSource = source || (reason === 'auto' ? 'auto_popup' : 'hero');
    preparePopup(mode);
    popupOpened = true;
    popup.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      popup.classList.add('pm-home-popup--open');
    });

    var events = [
      {
        experiment: experimentName('lead_source'),
        variant: lastLeadSource,
        metric: 'impression',
      },
    ];
    if (reason === 'auto') {
      autoPopupExposed = true;
      try {
        sessionStorage.setItem('pm_lp_popup_seen_' + pagePrefix, '1');
      } catch (e) {}
      events.push(
        {
          experiment: experimentName('popup_mode'),
          variant: assignments.popup_mode,
          metric: 'impression',
        },
        {
          experiment: experimentName('popup_trigger'),
          variant: assignments.popup_trigger,
          metric: 'click',
        },
      );
    }
    trackEvents(events);
  }

  function closePopup() {
    var popup = document.getElementById('pm-home-popup');
    if (!popup) return;
    popup.classList.remove('pm-home-popup--open');
    window.setTimeout(function () {
      popup.hidden = true;
      document.body.style.overflow = '';
      popupOpened = false;
    }, 250);
  }

  function initTriggers(assignments) {
    var trigger = assignments.popup_trigger;
    if (trigger === 'time_30s') {
      window.setTimeout(function () {
        openPopup('auto', 'auto_popup');
      }, 30000);
      return;
    }
    if (trigger === 'scroll_50pct') {
      var fired = false;
      var onScroll = function () {
        if (fired) return;
        var root = document.documentElement;
        var ratio = window.scrollY / Math.max(root.scrollHeight - window.innerHeight, 1);
        if (ratio >= 0.5) {
          fired = true;
          window.removeEventListener('scroll', onScroll);
          openPopup('auto', 'auto_popup');
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return;
    }

    var exitFired = false;
    if (window.matchMedia('(pointer:fine)').matches) {
      document.addEventListener('mouseout', function (event) {
        if (exitFired || event.relatedTarget || event.clientY > 8) return;
        exitFired = true;
        openPopup('auto', 'auto_popup');
      });
    } else {
      window.setTimeout(function () {
        if (exitFired) return;
        exitFired = true;
        openPopup('auto', 'auto_popup');
      }, 45000);
    }
  }

  function sourceForTarget(target) {
    if (target.closest('.sticky-cta')) return 'sticky';
    if (target.getAttribute('data-ab-open') === 'offer') return 'offer';
    return 'hero';
  }

  function wireCtas(assignments) {
    document.addEventListener('click', function (event) {
      var target =
        event.target && event.target.closest
          ? event.target.closest('[data-lead-modal-open], a[href="#contact"]')
          : null;
      if (!target) return;
      event.preventDefault();
      var source = sourceForTarget(target);
      lastLeadSource = source;
      trackEvents([
        { experiment: experimentName('page_order'), variant: assignments.page_order, metric: 'click' },
        { experiment: experimentName('cta_copy'), variant: assignments.cta_copy, metric: 'click' },
        { experiment: experimentName('lead_source'), variant: source, metric: 'click' },
      ]);
      openPopup('click', source);
    });
  }

  function trackConversion(sourceOverride) {
    var assignments = getAssignments();
    var source = sourceOverride || lastLeadSource || 'inline_form';
    var events = [
      { experiment: experimentName('page_order'), variant: assignments.page_order, metric: 'conversion' },
      { experiment: experimentName('cta_copy'), variant: assignments.cta_copy, metric: 'conversion' },
      {
        experiment: experimentName('popup_trigger'),
        variant: assignments.popup_trigger,
        metric: 'conversion',
      },
      { experiment: experimentName('lead_source'), variant: source, metric: 'conversion' },
      { experiment: 'landing_keyword', variant: pageSlug, metric: 'conversion' },
    ];
    if (autoPopupExposed) {
      events.push(
        { experiment: experimentName('popup_mode'), variant: assignments.popup_mode, metric: 'conversion' },
        {
          experiment: experimentName('popup_trigger'),
          variant: assignments.popup_trigger,
          metric: 'conversion',
        },
      );
    }
    return trackEvents(events);
  }

  function trackPopupInteraction() {
    if (!autoPopupExposed) return;
    var assignments = getAssignments();
    trackEvents([
      { experiment: experimentName('popup_mode'), variant: assignments.popup_mode, metric: 'click' },
    ]);
  }

  function loadAllocation() {
    return fetch('/api/lp-ab-allocate?page=' + encodeURIComponent(pageSlug))
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data && data.ok && data.experiments) allocationByExperiment = data.experiments;
        rebalanceAssignments();
      })
      .catch(function () {});
  }

  window.pmLpAb = {
    ready: loadAllocation(),
    CONFIG: CONFIG,
    getOrder: function () {
      return getAssignments().page_order;
    },
    getKeyword: function () {
      return pageSlug;
    },
    getAssignments: getAssignments,
    findVariant: findVariant,
    getPopupFormTitle: function () {
      return popupCopy().directTitle;
    },
    setLeadSource: function (source) {
      lastLeadSource = source || lastLeadSource;
    },
    getLeadSource: function () {
      return lastLeadSource;
    },
    openPopup: openPopup,
    closePopup: closePopup,
    trackPopupInteraction: trackPopupInteraction,
    trackConversion: trackConversion,
  };

  window.pmLpAb.ready.then(function () {
    var assignments = getAssignments();
    applyAssignments(assignments);
    trackEvents([
      { experiment: experimentName('page_order'), variant: assignments.page_order, metric: 'impression' },
      { experiment: experimentName('cta_copy'), variant: assignments.cta_copy, metric: 'impression' },
      {
        experiment: experimentName('popup_trigger'),
        variant: assignments.popup_trigger,
        metric: 'impression',
      },
      { experiment: 'landing_keyword', variant: pageSlug, metric: 'impression' },
    ]);
    wireCtas(assignments);
    initTriggers(assignments);
  });
})();
