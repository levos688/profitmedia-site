(function () {
  var STORAGE_KEY = 'donhin_ab_v1';
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
    // 2026-10-14 marketing-psychology review (canvases/donhin-ab-home-review):
    // retired arms stay server-side (ab-stats-core.ts AB_EXPERIMENTS) for history,
    // but are removed from these live variant lists so pickVariant/rebalance skip them.
    sticky_cta: {
      variants: [
        { id: 'ask_lawyer', label: 'Задать вопрос адвокату' },
        { id: 'lawyer_reply', label: 'Получить ответ адвоката' },
        // Zero-Price Effect challenger: historic free_consult beat get_consult 4.5x on CVR.
        { id: 'free_check', label: 'Бесплатно узнать компенсацию' },
      ],
    },
    popup_delay: {
      variants: [
        { id: '22s', ms: 22000 },
        { id: '25s', ms: 25000 },
        // Later delay kept winning over 15s/18s; test whether the trend continues.
        { id: '28s', ms: 28000 },
      ],
    },
    popup_scroll: {
      variants: [
        { id: '60pct', ratio: 0.6 },
        { id: '50pct', ratio: 0.5 },
        // Earlier scroll kept winning over 80pct; test whether even earlier helps.
        { id: '40pct', ratio: 0.4 },
      ],
    },
    quiz_copy: {
      variants: [
        {
          id: 'control',
          label: 'Контроль: ответьте на вопрос',
          sectionTitle: 'Ответьте на вопрос — получите бесплатную консультацию адвоката',
          question: 'Оказывалась ли вам медицинская или стоматологическая помощь в последние 7 лет?',
          nextLabel: 'Следующий',
          step2Heading: 'Запишитесь на бесплатную консультацию',
          submitLabel: 'Отправить',
          theme: 'light',
        },
        // ask_case retired 2026-10-14: 0 conversions / 13 impressions (fb channel),
        // "разбор случая" + "Жду звонок адвоката" added friction vs control's plain yes/no question.
        {
          id: 'dark_band',
          label: 'Дизайн: синяя полоса 100%',
          sectionTitle: 'Ответьте на вопрос — получите бесплатную консультацию адвоката',
          question: 'Оказывалась ли вам медицинская или стоматологическая помощь в последние 7 лет?',
          nextLabel: 'Следующий',
          step2Heading: 'Запишитесь на бесплатную консультацию',
          submitLabel: 'Отправить',
          theme: 'dark_band',
        },
        {
          id: 'risk_reversal',
          label: 'Текст: оплата по результату',
          sectionTitle: 'Ответьте на вопрос — получите бесплатную консультацию адвоката',
          question: 'Оказывалась ли вам медицинская или стоматологическая помощь в последние 7 лет?',
          nextLabel: 'Следующий',
          step2Heading: 'Запишитесь на бесплатную консультацию',
          submitLabel: 'Отправить — оплата только если выиграем дело',
          theme: 'light',
        },
      ],
    },
    bottom_copy: {
      variants: [
        {
          id: 'sum',
          label: 'Сумма компенсации',
          title: 'Узнайте сумму вашей компенсации',
          note: 'Проверка дела - бесплатно. Оплата только при выигрыше',
          submitLabel: 'Рассчитать сумму',
          theme: 'dark_band',
        },
        {
          id: 'reply',
          label: 'Ответ адвоката',
          title: 'Получите ответ адвоката по вашему делу',
          note: 'Бесплатный разбор ситуации. Оплата только при выигрыше',
          submitLabel: 'Получить ответ',
          theme: 'dark_band',
        },
        {
          id: 'claim',
          label: 'Право на компенсацию',
          title: 'Проверьте право на компенсацию',
          note: 'Без расходов сейчас. Оплата услуг только если выиграем дело',
          submitLabel: 'Проверить право',
          theme: 'dark_band',
        },
      ],
    },
    form_button: {
      variants: [{ id: 'black', label: 'Чёрная кнопка' }],
    },
    hero_media: {
      variants: [
        { id: 'photo', label: 'Фото в hero' },
        { id: 'video', label: 'Видео Vimeo в hero' },
      ],
    },
  };

  var allocationByExperiment = null;

  function defaultEqualWeights(experiment) {
    var list = CONFIG[experiment].variants;
    var weights = {};
    for (var i = 0; i < list.length; i++) {
      weights[list[i].id] = 1 / list.length;
    }
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
    for (var i = 0; i < list.length; i++) {
      total += Number(weights[list[i].id]) || 0;
    }
    if (!(total > 0)) {
      return list[Math.floor(Math.random() * list.length)];
    }
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
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === variant) return true;
    }
    return false;
  }

  function findVariant(experiment, id) {
    var list = CONFIG[experiment] && CONFIG[experiment].variants;
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
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
        force_sticky: 'sticky_cta',
        force_quiz: 'quiz_copy',
        force_bottom: 'bottom_copy',
        force_form_button: 'form_button',
        force_hero: 'hero_media',
        force_delay: 'popup_delay',
        force_scroll: 'popup_scroll',
      };
      var changed = false;
      Object.keys(map).forEach(function (param) {
        var experiment = map[param];
        var value = (url.searchParams.get(param) || '').trim();
        if (!value) return;
        if (!isActiveVariant(experiment, value)) return;
        if (assignments[experiment] !== value) {
          assignments[experiment] = value;
          changed = true;
        }
      });
      if (changed) writeAssignments(assignments);
    } catch (e) {}
    return assignments;
  }

  function pickDifferentVariant(experiment, excludeId) {
    var list = CONFIG[experiment].variants.filter(function (variant) {
      return variant.id !== excludeId && isActiveVariant(experiment, variant.id);
    });
    if (!list.length) return excludeId;
    var weights = getWeights(experiment);
    var total = 0;
    for (var i = 0; i < list.length; i++) total += Number(weights[list[i].id]) || 0;
    if (!(total > 0)) return list[Math.floor(Math.random() * list.length)].id;
    var roll = Math.random() * total;
    var cursor = 0;
    for (var j = 0; j < list.length; j++) {
      cursor += Number(weights[list[j].id]) || 0;
      if (roll <= cursor) return list[j].id;
    }
    return list[list.length - 1].id;
  }

  function ensureFormPair(assignments) {
    var primary = assignments.bottom_copy;
    var alt = assignments.bottom_copy_b;
    if (!alt || alt === primary || !isActiveVariant('bottom_copy', alt)) {
      assignments.bottom_copy_b = pickDifferentVariant('bottom_copy', primary);
    }
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
      return finishAssignments(existing);
    }

    var assignments = {
      sticky_cta: pickVariant('sticky_cta').id,
      popup_delay: pickVariant('popup_delay').id,
      popup_scroll: pickVariant('popup_scroll').id,
      quiz_copy: pickVariant('quiz_copy').id,
      bottom_copy: pickVariant('bottom_copy').id,
      form_button: pickVariant('form_button').id,
      hero_media: pickVariant('hero_media').id,
    };
    return finishAssignments(assignments);
  }

  function finishAssignments(assignments) {
    applyForceOverrides(assignments);
    ensureFormPair(assignments);
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
    if (isTrackingSkipped()) return Promise.resolve();
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

  /** One request = one D1 batch, so sticky/popup conversions cannot overwrite each other. */
  function trackEvents(events) {
    if (isTrackingSkipped()) return Promise.resolve();
    if (!events || !events.length) return Promise.resolve();
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
    var variant = findVariant('sticky_cta', id);
    return variant ? variant.label : CONFIG.sticky_cta.variants[0].label;
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

  function setText(el, value) {
    if (el && typeof value === 'string') el.textContent = value;
  }

  function applyQuizCopy(variantId) {
    var copy = findVariant('quiz_copy', variantId) || CONFIG.quiz_copy.variants[0];
    var section = document.getElementById('form-quiz') || document.querySelector('.donhin-form-section');
    if (section) {
      section.classList.toggle('donhin-form-section--dark-band', copy.theme === 'dark_band');
      section.setAttribute('data-ab-band', copy.theme === 'dark_band' ? 'dark' : 'light');
    }
    var sectionTitle = document.querySelector('.donhin-form-section__title');
    setText(sectionTitle, copy.sectionTitle);

    document.querySelectorAll('#donhin-quiz-form .donhin-quiz__question, #donhin-popup-quiz-form .donhin-quiz__question').forEach(function (el) {
      setText(el, copy.question);
    });
    document.querySelectorAll('#donhin-quiz-form [data-quiz-next], #donhin-popup-quiz-form [data-quiz-next]').forEach(function (el) {
      setText(el, copy.nextLabel);
    });
    document.querySelectorAll('#donhin-quiz-form .donhin-form__heading, #donhin-popup-quiz-form .donhin-form__heading').forEach(function (el) {
      setText(el, copy.step2Heading);
    });
    document.querySelectorAll('#donhin-quiz-form button[type="submit"], #donhin-popup-quiz-form button[type="submit"]').forEach(function (el) {
      setText(el, copy.submitLabel);
    });

    var popup = document.getElementById('donhin-popup');
    if (popup) popup.dataset.quizTitle = copy.sectionTitle;
    return copy;
  }

  function paintShortForm(root, copy) {
    if (!root || !copy) return;
    setText(root.querySelector('.donhin-bottom-form__title'), copy.title);
    setText(root.querySelector('.donhin-form-promise'), copy.note);
    setText(root.querySelector('button[type="submit"]'), copy.submitLabel);
  }

  function applyBottomCopy(variantId, altId) {
    var copy = findVariant('bottom_copy', variantId) || CONFIG.bottom_copy.variants[0];
    var alt = findVariant('bottom_copy', altId);
    if (!alt || alt.id === copy.id) {
      alt = findVariant('bottom_copy', pickDifferentVariant('bottom_copy', copy.id)) || copy;
    }
    document.querySelectorAll('.donhin-short-form').forEach(function (section) {
      section.classList.toggle('donhin-bottom-form--dark-band', copy.theme === 'dark_band');
      section.setAttribute('data-ab-band', copy.theme === 'dark_band' ? 'dark' : 'light');
    });
    paintShortForm(document.getElementById('form-top'), copy);
    paintShortForm(document.getElementById('form-bottom'), alt);
    var popup = document.getElementById('donhin-popup');
    if (popup) popup.dataset.simpleTitle = copy.title;
    return copy;
  }

  function applyFormButton() {
    document.querySelectorAll('#donhin-top-form button[type="submit"], #donhin-bottom-form button[type="submit"]').forEach(function (el) {
      el.classList.add('donhin-btn--form-mist');
      el.classList.remove('donhin-btn--form-black');
    });
    document.querySelectorAll('#donhin-popup-simple-form button[type="submit"]').forEach(function (el) {
      el.classList.add('donhin-btn--form-black');
      el.classList.remove('donhin-btn--form-mist');
    });
  }

  function applyHeroCta(stickyId) {
    var hero = document.getElementById('donhin-hero-cta');
    setText(hero, stickyLabel(stickyId));
  }

  function ensureVimeoApi() {
    if (window.Vimeo || document.querySelector('script[data-donhin-vimeo]')) return;
    var script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.async = true;
    script.setAttribute('data-donhin-vimeo', '1');
    document.head.appendChild(script);
  }

  function applyHeroMedia(variantId) {
    var media = document.getElementById('donhin-hero-media');
    if (!media) return;
    var showVideo = variantId === 'video';
    var photoPanel = media.querySelector('[data-hero-panel="photo"]');
    var videoPanel = media.querySelector('[data-hero-panel="video"]');
    media.setAttribute('data-hero-media', showVideo ? 'video' : 'photo');
    if (photoPanel) {
      if (showVideo) photoPanel.setAttribute('hidden', '');
      else photoPanel.removeAttribute('hidden');
    }
    if (videoPanel) {
      if (showVideo) {
        videoPanel.removeAttribute('hidden');
        var iframe = document.getElementById('donhin-hero-vimeo');
        if (iframe && !iframe.getAttribute('src')) {
          var src = iframe.getAttribute('data-src') || '';
          if (src) iframe.setAttribute('src', src);
        }
        ensureVimeoApi();
      } else {
        videoPanel.setAttribute('hidden', '');
        var idle = document.getElementById('donhin-hero-vimeo');
        if (idle) idle.removeAttribute('src');
      }
    }
  }

  function applyCopyVariants(assignments) {
    applyQuizCopy(assignments.quiz_copy);
    applyBottomCopy(assignments.bottom_copy, assignments.bottom_copy_b);
    applyFormButton();
    applyHeroCta(assignments.sticky_cta);
    applyHeroMedia(assignments.hero_media);
  }

  function initStickyCta(assignments, openPopupFromSticky) {
    var bar = document.getElementById('donhin-sticky-cta');
    var btn = document.getElementById('donhin-sticky-cta-btn');
    if (!bar || !btn) return;

    btn.textContent = stickyLabel(assignments.sticky_cta);
    bar.hidden = false;
    bar.classList.remove('hidden');
    document.body.classList.add('donhin-has-sticky');

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      track('sticky_cta', assignments.sticky_cta, 'click');
      if (typeof openPopupFromSticky === 'function') openPopupFromSticky();
    });
  }

  var POPUP_ARM_MS = 8000;
  var POPUP_MIN_SCROLL_PX = 400;
  var POPUP_MIN_SCROLLABLE_PX = 600;

  function initPopup(assignments, openPopup) {
    var delay = delayMs(assignments.popup_delay);
    var ratio = scrollRatio(assignments.popup_scroll);
    var scrollTriggered = false;
    var armedAt = Date.now() + POPUP_ARM_MS;

    window.setTimeout(function () {
      openPopup('timer');
    }, delay);

    function onScroll() {
      if (scrollTriggered) return;
      if (Date.now() < armedAt) return;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      // Instagram in-app often reports a collapsed first layout. A ratio
      // against ~0px of scroll room opens the quiz before the page is seen.
      if (scrollable < POPUP_MIN_SCROLLABLE_PX) return;
      if (window.scrollY < POPUP_MIN_SCROLL_PX) return;
      if (window.scrollY / scrollable >= ratio) {
        scrollTriggered = true;
        openPopup('scroll');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  var HYBRID_REROLL_MAX_WEIGHT = 0.15;

  /** Re-roll once if assigned arm is weight 0 (solo) or ≤15% while hybrid/catchup favors another. */
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
      var flagKey =
        'donhin_rebalance_' + experiment + '_' + (alloc.mode || 'x') + '_' + (alloc.leader || 'none');
      try {
        if (localStorage.getItem(flagKey) === '1') return;
        existing[experiment] = pickVariant(experiment).id;
        localStorage.setItem(flagKey, '1');
        changed = true;
      } catch (e) {}
    });
    var pairBefore = existing.bottom_copy_b;
    ensureFormPair(existing);
    if (changed || existing.bottom_copy_b !== pairBefore) writeAssignments(existing);
  }

  function loadAllocation() {
    return fetch('/api/ab-allocate', { credentials: 'same-origin' })
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

  window.donhinAb = {
    ready: loadAllocation(),
    getAssignments: getAssignments,
    getAllocation: function () {
      return allocationByExperiment;
    },
    applyCopyVariants: applyCopyVariants,
    getQuizCopy: function (id) {
      return findVariant('quiz_copy', id) || CONFIG.quiz_copy.variants[0];
    },
    getBottomCopy: function (id) {
      return findVariant('bottom_copy', id) || CONFIG.bottom_copy.variants[0];
    },
    trackConversion: function (formType) {
      var assignments = getAssignments();
      var events = [
        { experiment: 'sticky_cta', variant: assignments.sticky_cta, metric: 'conversion' },
        { experiment: 'popup_delay', variant: assignments.popup_delay, metric: 'conversion' },
        { experiment: 'popup_scroll', variant: assignments.popup_scroll, metric: 'conversion' },
        { experiment: 'hero_media', variant: assignments.hero_media, metric: 'conversion' },
      ];
      var source = normalizeLeadSource(formType);
      if (source) {
        events.push({ experiment: 'lead_source', variant: source, metric: 'conversion' });
      }
      if (source === 'quiz' || source === 'popup_quiz') {
        events.push({ experiment: 'quiz_copy', variant: assignments.quiz_copy, metric: 'conversion' });
      }
      if (source === 'simple' || source === 'popup_simple' || source === 'top_form' || source === 'hero_cta') {
        var copyId = source === 'simple' || source === 'popup_simple' ? assignments.bottom_copy_b : assignments.bottom_copy;
        events.push({ experiment: 'bottom_copy', variant: copyId || assignments.bottom_copy, metric: 'conversion' });
        events.push({ experiment: 'form_button', variant: assignments.form_button, metric: 'conversion' });
      }
      return trackEvents(events);
    },
    trackLeadSource: function (formType, metric) {
      var source = normalizeLeadSource(formType);
      if (!source || !metric) return Promise.resolve();
      return track('lead_source', source, metric);
    },
    trackCopyMetric: function (experiment, metric) {
      var assignments = getAssignments();
      if (!assignments[experiment] || !metric) return Promise.resolve();
      return track(experiment, assignments[experiment], metric);
    },
    trackFormClick: function (slot) {
      var assignments = getAssignments();
      var variant = slot === 'bottom' || slot === 'sticky' ? assignments.bottom_copy_b : assignments.bottom_copy;
      return trackEvents([
        { experiment: 'bottom_copy', variant: variant || assignments.bottom_copy, metric: 'click' },
        { experiment: 'form_button', variant: assignments.form_button, metric: 'click' },
      ]);
    },
    /** One batched request for all page-load impressions. */
    trackPageImpressions: function (assignments) {
      var a = assignments || getAssignments();
      var events = [
        { experiment: 'sticky_cta', variant: a.sticky_cta, metric: 'impression' },
        { experiment: 'lead_source', variant: 'top_form', metric: 'impression' },
        { experiment: 'lead_source', variant: 'simple', metric: 'impression' },
        { experiment: 'lead_source', variant: 'hero_cta', metric: 'impression' },
        { experiment: 'quiz_copy', variant: a.quiz_copy, metric: 'impression' },
        { experiment: 'bottom_copy', variant: a.bottom_copy, metric: 'impression' },
        { experiment: 'form_button', variant: a.form_button, metric: 'impression' },
        { experiment: 'hero_media', variant: a.hero_media, metric: 'impression' },
      ];
      if (a.bottom_copy_b && a.bottom_copy_b !== a.bottom_copy) {
        events.push({ experiment: 'bottom_copy', variant: a.bottom_copy_b, metric: 'impression' });
      }
      return trackEvents(events);
    },
    trackPopupImpression: function (assignments, leadSource) {
      var events = [
        { experiment: 'popup_delay', variant: assignments.popup_delay, metric: 'impression' },
        { experiment: 'popup_scroll', variant: assignments.popup_scroll, metric: 'impression' },
      ];
      var source = normalizeLeadSource(leadSource);
      if (source) {
        events.push({ experiment: 'lead_source', variant: source, metric: 'impression' });
      }
      return trackEvents(events);
    },
    isTrackingSkipped: isTrackingSkipped,
    initStickyCta: initStickyCta,
    initPopup: initPopup,
  };

  function normalizeLeadSource(formType) {
    if (!formType) return '';
    var map = {
      quiz: 'quiz',
      simple: 'simple',
      top_form: 'top_form',
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
