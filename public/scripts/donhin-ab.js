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
    sticky_cta: {
      variants: [
        { id: 'ask_lawyer', label: 'Задать вопрос адвокату' },
        { id: 'lawyer_reply', label: 'Получить ответ адвоката' },
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
        {
          id: 'ask_case',
          label: '1 вопрос → разбор случая',
          sectionTitle: '1 короткий вопрос — адвокат разберёт ваш случай',
          question: 'Было ли у вас стоматологическое лечение за последние 7 лет?',
          nextLabel: 'Продолжить',
          step2Heading: 'Куда прислать ответ адвоката?',
          submitLabel: 'Жду звонок адвоката',
          theme: 'light',
        },
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
      ],
    },
    bottom_copy: {
      variants: [
        {
          id: 'control',
          label: 'Контроль: светлая форма',
          title: 'Оставьте заявку для бесплатной консультации',
          submitLabel: 'Отправить',
          theme: 'light',
        },
        {
          id: 'ask_lawyer',
          label: 'Текст: задайте вопрос',
          title: 'Задайте вопрос адвокату — без обязательств',
          submitLabel: 'Задать вопрос',
          theme: 'light',
        },
        {
          id: 'dark_band',
          label: 'Дизайн: тёмная полоса 100%',
          title: 'Оставьте заявку для бесплатной консультации',
          submitLabel: 'Отправить',
          theme: 'dark_band',
        },
      ],
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

    var assignments = {
      sticky_cta: pickVariant('sticky_cta').id,
      popup_delay: pickVariant('popup_delay').id,
      popup_scroll: pickVariant('popup_scroll').id,
      quiz_copy: pickVariant('quiz_copy').id,
      bottom_copy: pickVariant('bottom_copy').id,
      hero_media: pickVariant('hero_media').id,
    };
    writeAssignments(assignments);
    return applyForceOverrides(assignments);
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

  function applyBottomCopy(variantId) {
    var copy = findVariant('bottom_copy', variantId) || CONFIG.bottom_copy.variants[0];
    var section = document.getElementById('form-bottom') || document.querySelector('.donhin-bottom-form');
    if (section) {
      section.classList.toggle('donhin-bottom-form--dark-band', copy.theme === 'dark_band');
      section.setAttribute('data-ab-band', copy.theme === 'dark_band' ? 'dark' : 'light');
    }
    setText(document.querySelector('.donhin-bottom-form__title'), copy.title);
    var submit = document.querySelector('#donhin-bottom-form button[type="submit"]');
    setText(submit, copy.submitLabel);
    var popup = document.getElementById('donhin-popup');
    if (popup) popup.dataset.simpleTitle = copy.title;
    var popupSimpleSubmit = document.querySelector('#donhin-popup-simple-form button[type="submit"]');
    setText(popupSimpleSubmit, copy.submitLabel);
    return copy;
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
    applyBottomCopy(assignments.bottom_copy);
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

  function getScrollDepth() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight - window.innerHeight, 1);
    return window.scrollY / total;
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
    if (changed) writeAssignments(existing);
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
      if (source === 'simple' || source === 'popup_simple') {
        events.push({ experiment: 'bottom_copy', variant: assignments.bottom_copy, metric: 'conversion' });
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
    /** One batched request for all page-load impressions. */
    trackPageImpressions: function (assignments) {
      var a = assignments || getAssignments();
      return trackEvents([
        { experiment: 'sticky_cta', variant: a.sticky_cta, metric: 'impression' },
        { experiment: 'lead_source', variant: 'quiz', metric: 'impression' },
        { experiment: 'lead_source', variant: 'simple', metric: 'impression' },
        { experiment: 'quiz_copy', variant: a.quiz_copy, metric: 'impression' },
        { experiment: 'bottom_copy', variant: a.bottom_copy, metric: 'impression' },
        { experiment: 'hero_media', variant: a.hero_media, metric: 'impression' },
      ]);
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
