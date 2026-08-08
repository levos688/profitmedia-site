(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  const statusEl = document.getElementById('ab-stats-status');
  const rootEl = document.getElementById('ab-stats-root');
  const updatedEl = document.getElementById('ab-stats-updated');
  const channelNoteEl = document.getElementById('ab-stats-channel-note');
  const rangeLabelEl = document.getElementById('ab-stats-range-label');
  const dateOpenBtn = document.getElementById('ab-stats-date-open');
  const dateModal = document.getElementById('ab-stats-date-modal');
  const tabButtons = Array.from(document.querySelectorAll('.ab-stats__tab'));

  const TZ = 'Asia/Jerusalem';
  const DAILY_SINCE_FALLBACK = '2026-07-22';

  const channelFromUrl = params.get('channel');
  let activeChannel = channelFromUrl === 'all' ? 'all' : 'fb_ads';
  let cachedData = null;
  let loading = false;

  let rangeState = {
    preset: params.get('preset') || 'last_30_days',
    from: params.get('from') || null,
    to: params.get('to') || null,
    compare: params.get('compare') === '1',
    compareFrom: params.get('compareFrom') || null,
    compareTo: params.get('compareTo') || null,
  };
  let chartGrain = params.get('grain') === 'week' || params.get('grain') === 'month' ? params.get('grain') : 'day';

  const labels = {
    sticky_cta: {
      get_consult: 'Получить бесплатную консультацию',
      free_consult: 'Бесплатная консультация',
      ask_lawyer: 'Задать вопрос адвокату',
      lawyer_reply: 'Получить ответ адвоката',
    },
    popup_delay: {
      '15s': '15 секунд',
      '18s': '18 секунд',
      '22s': '22 секунды',
      '25s': '25 секунд',
    },
    popup_scroll: {
      '80pct': 'Скролл 80%',
      '60pct': 'Скролл 60%',
      '50pct': 'Скролл 50%',
    },
    quiz_copy: {
      control: 'Контроль: ответьте на вопрос',
      ask_case: '1 вопрос → разбор случая',
      dark_band: 'Дизайн: синяя полоса 100%',
    },
    bottom_copy: {
      control: 'Контроль: светлая форма',
      ask_lawyer: 'Текст: задайте вопрос',
      dark_band: 'Дизайн: тёмная полоса 100%',
    },
    hero_media: {
      photo: 'Фото в hero',
      video: 'Видео Vimeo в hero',
    },
    lead_source: {
      quiz: 'Квиз на странице',
      simple: 'Форма внизу страницы',
      popup_quiz: 'Popup с квизом',
      popup_simple: 'Popup со sticky-кнопки',
      hero_cta: 'Кнопка в шапке (hero)',
    },
  };

  const titles = {
    sticky_cta: 'Кнопка внизу экрана',
    popup_delay: 'Таймер popup',
    popup_scroll: 'Скролл popup',
    quiz_copy: 'Квиз (текст / дизайн)',
    bottom_copy: 'Нижняя форма (текст / дизайн)',
    hero_media: 'Hero: фото или видео',
    lead_source: 'Детализация источников заявок',
  };

  const activeVariantsFallback = {
    sticky_cta: ['ask_lawyer', 'lawyer_reply'],
    popup_delay: ['22s', '25s'],
    popup_scroll: ['60pct', '50pct'],
    quiz_copy: ['control', 'ask_case', 'dark_band'],
    bottom_copy: ['control', 'ask_lawyer', 'dark_band'],
    hero_media: ['photo', 'video'],
    lead_source: ['quiz', 'simple', 'popup_quiz', 'popup_simple', 'hero_cta'],
  };

  function getActiveList(experiment) {
    const fromApi = cachedData?.activeVariants?.[experiment];
    if (Array.isArray(fromApi) && fromApi.length) return fromApi;
    return activeVariantsFallback[experiment] || null;
  }

  function isVariantActive(experiment, variant) {
    const list = getActiveList(experiment);
    if (!list) return true;
    return list.includes(variant);
  }

  const channelNotes = {
    fb_ads: 'Показана статистика только с переходов из Facebook Ads (fbclid, utm_source=ri_XX и т.п.).',
    all: 'Показана вся статистика, включая ваши тестовые визиты без рекламы.',
  };

  const PRESETS = [
    { id: 'today', label: 'Сегодня' },
    { id: 'yesterday', label: 'Вчера' },
    { id: 'last_7_days', label: 'Последние 7 дней' },
    { id: 'last_14_days', label: 'Последние 14 дней' },
    { id: 'last_28_days', label: 'Последние 28 дней' },
    { id: 'last_30_days', label: 'Последние 30 дней' },
    { id: 'this_week', label: 'Эта неделя' },
    { id: 'last_week', label: 'Прошлая неделя' },
    { id: 'this_month', label: 'Этот месяц' },
    { id: 'last_month', label: 'Прошлый месяц' },
    { id: 'all_time', label: 'За всё время' },
    { id: 'custom', label: 'Свой период' },
  ];

  function jerusalemToday() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  function parseDay(day) {
    const d = new Date(`${day}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatDay(date) {
    return date.toISOString().slice(0, 10);
  }

  function shiftDay(day, delta) {
    const d = parseDay(day);
    if (!d) return day;
    d.setUTCDate(d.getUTCDate() + delta);
    return formatDay(d);
  }

  function startOfWeek(day) {
    const d = parseDay(day);
    if (!d) return day;
    const dow = d.getUTCDay(); // 0 Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    d.setUTCDate(d.getUTCDate() + mondayOffset);
    return formatDay(d);
  }

  function resolvePreset(preset, today) {
    if (preset === 'all_time') return { from: null, to: null, label: 'За всё время' };
    if (preset === 'today') return { from: today, to: today, label: 'Сегодня' };
    if (preset === 'yesterday') {
      const y = shiftDay(today, -1);
      return { from: y, to: y, label: 'Вчера' };
    }
    if (preset === 'last_7_days')
      return { from: shiftDay(today, -6), to: today, label: 'Последние 7 дней' };
    if (preset === 'last_14_days')
      return { from: shiftDay(today, -13), to: today, label: 'Последние 14 дней' };
    if (preset === 'last_28_days')
      return { from: shiftDay(today, -27), to: today, label: 'Последние 28 дней' };
    if (preset === 'last_30_days')
      return { from: shiftDay(today, -29), to: today, label: 'Последние 30 дней' };
    if (preset === 'this_week') {
      const from = startOfWeek(today);
      return { from, to: today, label: 'Эта неделя' };
    }
    if (preset === 'last_week') {
      const thisMon = startOfWeek(today);
      const to = shiftDay(thisMon, -1);
      const from = shiftDay(to, -6);
      return { from, to, label: 'Прошлая неделя' };
    }
    if (preset === 'this_month') {
      const from = `${today.slice(0, 8)}01`;
      return { from, to: today, label: 'Этот месяц' };
    }
    if (preset === 'last_month') {
      const firstThis = `${today.slice(0, 8)}01`;
      const lastPrev = shiftDay(firstThis, -1);
      const from = `${lastPrev.slice(0, 8)}01`;
      return { from, to: lastPrev, label: 'Прошлый месяц' };
    }
    if (rangeState.from && rangeState.to) {
      return { from: rangeState.from, to: rangeState.to, label: `${fmtRu(rangeState.from)} — ${fmtRu(rangeState.to)}` };
    }
    return { from: shiftDay(today, -29), to: today, label: 'Последние 30 дней' };
  }

  function fmtRu(day) {
    const d = parseDay(day);
    if (!d) return day;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  function previousPeriod(from, to) {
    const start = parseDay(from);
    const end = parseDay(to);
    if (!start || !end) return null;
    const days = Math.round((end - start) / 86400000) + 1;
    const prevTo = shiftDay(from, -1);
    const prevFrom = shiftDay(prevTo, -(days - 1));
    return { from: prevFrom, to: prevTo };
  }

  function scoreVariant(experiment, variant) {
    if (experiment === 'lead_source') return variant.conversion * 1000 + variant.click;
    if (experiment === 'sticky_cta' || experiment === 'quiz_copy' || experiment === 'bottom_copy' || experiment === 'hero_media') {
      return variant.cvr * 1000 + variant.ctr * 10 + variant.conversion;
    }
    return variant.cvr * 1000 + variant.conversion;
  }

  const RANK_MIN_IMPRESSIONS = 40;

  function rankMap(experiment, variants) {
    const ranked = new Map();
    if (experiment === 'lead_source') return ranked;

    const alloc = cachedData?.allocation?.[experiment];
    if (alloc?.leader && (alloc.mode === 'solo' || alloc.mode === 'hybrid')) {
      ranked.set(alloc.leader, 'win');
      Object.entries(alloc.weights || {}).forEach(([id, weight]) => {
        if (id === alloc.leader) return;
        if (!isVariantActive(experiment, id)) return;
        if (Number(weight) < 0.5) ranked.set(id, 'lose');
      });
      return ranked;
    }

    const eligible = variants.filter((v) => isVariantActive(experiment, v.variant));
    if (eligible.length < 2) return ranked;
    const withVolume = eligible.filter((v) => v.impression >= RANK_MIN_IMPRESSIONS);
    const pool = withVolume.length >= 2 ? withVolume : eligible.filter((v) => v.impression > 0);
    if (pool.length < 2) return ranked;
    const scored = pool.map((v) => ({ id: v.variant, score: scoreVariant(experiment, v), cvr: v.cvr }));
    scored.sort((a, b) => b.cvr - a.cvr || b.score - a.score);
    if (scored[0].cvr === scored[scored.length - 1].cvr && scored[0].score === scored[scored.length - 1].score) {
      return ranked;
    }
    ranked.set(scored[0].id, 'win');
    ranked.set(scored[scored.length - 1].id, 'lose');
    return ranked;
  }

  function renderSoloBanners(allocation) {
    if (!allocation) return '';
    return Object.entries(allocation)
      .filter(([, alloc]) => alloc && alloc.mode === 'solo' && alloc.leader)
      .map(([experiment, alloc]) => {
        const title = titles[experiment] || experiment;
        const winner = labels[experiment]?.[alloc.leader] || alloc.leader;
        return `<div class="ab-stats__solo-banner" role="status">
          <strong>Победа в «${title}»</strong>
          — вариант «${winner}». Сейчас работает только один вариант (100% трафика).
          Предложи новый challenger для следующего теста.
        </div>`;
      })
      .join('');
  }

  function sumVariants(variants) {
    const impression = variants.reduce((sum, v) => sum + v.impression, 0);
    const click = variants.reduce((sum, v) => sum + v.click, 0);
    const conversion = variants.reduce((sum, v) => sum + v.conversion, 0);
    const ctr = impression > 0 ? Number(((click / impression) * 100).toFixed(2)) : 0;
    const cvr = impression > 0 ? Number(((conversion / impression) * 100).toFixed(2)) : 0;
    return { impression, click, conversion, ctr, cvr };
  }

  function sumActiveVariants(experiment, variants) {
    return sumVariants(variants.filter((v) => isVariantActive(experiment, v.variant)));
  }

  function deltaHtml(current, previous, suffix = '') {
    if (previous == null || current == null) return '';
    const diff = Number((current - previous).toFixed(2));
    if (diff === 0) return `<span class="ab-stats__delta is-flat">0${suffix}</span>`;
    const cls = diff > 0 ? 'is-up' : 'is-down';
    const sign = diff > 0 ? '+' : '';
    return `<span class="ab-stats__delta ${cls}">${sign}${diff}${suffix}</span>`;
  }

  const GRAIN_LABELS = {
    day: 'По дням',
    week: 'По неделям',
    month: 'По месяцам',
  };

  function monthKey(day) {
    return day.slice(0, 7);
  }

  function fmtMonth(key) {
    const d = parseDay(`${key}-01`);
    if (!d) return key;
    return d.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  function fmtWeekLabel(from, to) {
    return `${fmtRu(from)} – ${fmtRu(to)}`;
  }

  function aggregateSeries(daily, grain) {
    const points = Array.isArray(daily) ? daily : [];
    if (grain === 'day' || !points.length) {
      return points.map((p) => ({
        ...p,
        key: p.date,
        label: fmtRu(p.date),
      }));
    }

    const buckets = new Map();
    for (const p of points) {
      let key;
      let label;
      let bucketFrom = p.date;
      let bucketTo = p.date;
      if (grain === 'week') {
        key = startOfWeek(p.date);
        bucketFrom = key;
        bucketTo = shiftDay(key, 6);
        label = fmtWeekLabel(bucketFrom, bucketTo);
      } else {
        key = monthKey(p.date);
        bucketFrom = `${key}-01`;
        const nextMonth = shiftDay(bucketFrom, 32).slice(0, 8) + '01';
        bucketTo = shiftDay(nextMonth, -1);
        label = fmtMonth(key);
      }
      const prev = buckets.get(key) || {
        key,
        date: bucketFrom,
        label,
        views: 0,
        leads: 0,
        cvr: 0,
      };
      prev.views += Number(p.views) || 0;
      prev.leads += Number(p.leads) || 0;
      buckets.set(key, prev);
    }

    return Array.from(buckets.values()).map((b) => ({
      ...b,
      cvr: b.views > 0 ? Number(((b.leads / b.views) * 100).toFixed(2)) : 0,
    }));
  }

  function renderChart(daily, compareDaily) {
    const grain = chartGrain;
    const points = aggregateSeries(daily, grain);
    const comparePoints = aggregateSeries(compareDaily, grain);
    const title =
      grain === 'week' ? 'Конверсия страницы по неделям' : grain === 'month' ? 'Конверсия страницы по месяцам' : 'Конверсия страницы по дням';

    const grainToggle = `<div class="ab-stats__grain" role="group" aria-label="Масштаб графика">
      ${['day', 'week', 'month']
        .map(
          (g) =>
            `<button type="button" class="ab-stats__grain-btn ${grain === g ? 'is-active' : ''}" data-grain="${g}">${GRAIN_LABELS[g]}</button>`,
        )
        .join('')}
    </div>`;

    if (!points.length) {
      return `<section class="ab-stats__chart-card">
        <div class="ab-stats__block-head">
          <h2>${title}</h2>
          ${grainToggle}
        </div>
        <p class="ab-stats__alloc-note">Нет дневных данных за выбранный период. По дням считается с ${cachedData?.dailyTrackingSince || DAILY_SINCE_FALLBACK} (время Иерусалима).</p>
      </section>`;
    }

    const width = 720;
    const height = 210;
    const pad = { top: 16, right: 16, bottom: 34, left: 42 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxCvr = Math.max(
      5,
      ...points.map((p) => p.cvr),
      ...comparePoints.map((p) => p.cvr || 0),
    );

    const coords = (series) =>
      series.map((p, i) => {
        const x = pad.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
        const y = pad.top + innerH - (p.cvr / maxCvr) * innerH;
        return { x, y, ...p };
      });

    const primary = coords(points);
    const compare =
      rangeState.compare && comparePoints.length
        ? coords(
            points.map((p, i) => {
              const c = comparePoints[i] || { cvr: 0, views: 0, leads: 0, label: p.label };
              return {
                key: p.key,
                date: p.date,
                label: c.label || p.label,
                cvr: c.cvr || 0,
                views: c.views || 0,
                leads: c.leads || 0,
              };
            }),
          )
        : [];

    const line = (series, cls) => {
      if (!series.length) return '';
      const d = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      return `<path class="${cls}" d="${d}" fill="none" stroke-width="2.5" />`;
    };

    const dots = (series, cls) =>
      series
        .map(
          (p) =>
            `<circle class="${cls}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"><title>${p.label}: ${p.cvr}% (${p.leads}/${p.views})</title></circle>`,
        )
        .join('');

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = Number((maxCvr * t).toFixed(1));
      const y = pad.top + innerH - t * innerH;
      return `<g>
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="ab-stats__chart-grid" />
        <text x="${pad.left - 8}" y="${y + 4}" class="ab-stats__chart-axis" text-anchor="end">${val}%</text>
      </g>`;
    });

    const labelStep = Math.max(1, Math.ceil(primary.length / 6));
    const xLabels = primary
      .filter((_, i) => i === 0 || i === primary.length - 1 || i % labelStep === 0)
      .map(
        (p) =>
          `<text x="${p.x}" y="${height - 10}" class="ab-stats__chart-axis" text-anchor="middle">${p.label}</text>`,
      )
      .join('');

    return `<section class="ab-stats__chart-card">
      <div class="ab-stats__block-head">
        <div>
          <h2>${title}</h2>
          <p class="ab-stats__legend-note">CVR = заявки / показы sticky · ${TZ}</p>
        </div>
        ${grainToggle}
      </div>
      <div class="ab-stats__chart-wrap">
        <svg viewBox="0 0 ${width} ${height}" class="ab-stats__chart" role="img" aria-label="${title}">
          ${yTicks.join('')}
          ${line(compare, 'ab-stats__chart-line ab-stats__chart-line--compare')}
          ${line(primary, 'ab-stats__chart-line ab-stats__chart-line--primary')}
          ${dots(compare, 'ab-stats__chart-dot ab-stats__chart-dot--compare')}
          ${dots(primary, 'ab-stats__chart-dot ab-stats__chart-dot--primary')}
          ${xLabels}
        </svg>
      </div>
      ${
        rangeState.compare
          ? `<p class="ab-stats__chart-legend"><span class="ab-stats__swatch ab-stats__swatch--primary"></span> Текущий период <span class="ab-stats__swatch ab-stats__swatch--compare"></span> Сравнение</p>`
          : ''
      }
    </section>`;
  }

  function renderWidgetSummary(primary, compare) {
    const widgets = primary?.widgets || [];
    const page = primary?.page || { views: 0, leads: 0, cvr: 0 };
    const compareWidgets = new Map((compare?.widgets || []).map((w) => [w.id, w]));
    const comparePage = compare?.page;

    const rows = widgets
      .map((w) => {
        const prev = compareWidgets.get(w.id);
        return `<tr>
          <td class="ab-stats__variant"><span class="ab-stats__variant-name">${w.label}</span></td>
          <td class="ab-stats__num ab-stats__col--imp">${w.impression}${prev ? deltaHtml(w.impression, prev.impression) : ''}</td>
          <td class="ab-stats__num ab-stats__col--click">${w.click}${prev ? deltaHtml(w.click, prev.click) : ''}</td>
          <td class="ab-stats__num ab-stats__col--conv">${w.conversion}${prev ? deltaHtml(w.conversion, prev.conversion) : ''}</td>
          <td class="ab-stats__num ab-stats__col--ctr">${w.ctr}%${prev ? deltaHtml(w.ctr, prev.ctr, ' п.п.') : ''}</td>
          <td class="ab-stats__num ab-stats__col--cvr">${w.cvr}%${prev ? deltaHtml(w.cvr, prev.cvr, ' п.п.') : ''}</td>
        </tr>`;
      })
      .join('');

    return `<section class="ab-stats__block ab-stats__block--summary">
      <div class="ab-stats__block-head">
        <h2>Источник заявок и кликов</h2>
        <p class="ab-stats__legend-note">Итоги с каждой таблицы ниже + конверсия всей страницы</p>
      </div>
      <p class="ab-stats__alloc-note">Конверсия страницы = заявки форм / показы sticky-кнопки (прокси визитов). Дневная разбивка с ${cachedData?.dailyTrackingSince || DAILY_SINCE_FALLBACK}.</p>
      <div class="ab-stats__table-wrap">
        <table class="ab-stats__table">
          <thead>
            <tr>
              <th scope="col">Виджет</th>
              <th scope="col" class="ab-stats__col--imp">Показы</th>
              <th scope="col" class="ab-stats__col--click">Клики</th>
              <th scope="col" class="ab-stats__col--conv">Конверсии</th>
              <th scope="col" class="ab-stats__col--ctr">CTR</th>
              <th scope="col" class="ab-stats__col--cvr">CVR</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="ab-stats__total-row">
              <th scope="row">Конверсия страницы</th>
              <td class="ab-stats__num ab-stats__col--imp">${page.views}${comparePage ? deltaHtml(page.views, comparePage.views) : ''}</td>
              <td class="ab-stats__num ab-stats__col--click">—</td>
              <td class="ab-stats__num ab-stats__col--conv">${page.leads}${comparePage ? deltaHtml(page.leads, comparePage.leads) : ''}</td>
              <td class="ab-stats__num ab-stats__col--ctr">—</td>
              <td class="ab-stats__num ab-stats__col--cvr">${page.cvr}%${comparePage ? deltaHtml(page.cvr, comparePage.cvr, ' п.п.') : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>`;
  }

  function renderExperiments(experiments) {
    const experimentOrder = ['hero_media', 'quiz_copy', 'bottom_copy', 'lead_source', 'sticky_cta', 'popup_delay', 'popup_scroll'];
    const sorted = [...experiments].sort((a, b) => {
      const ai = experimentOrder.indexOf(a.experiment);
      const bi = experimentOrder.indexOf(b.experiment);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return sorted
      .map((experiment) => {
        const ranks = rankMap(experiment.experiment, experiment.variants);
        const isLeadSource = experiment.experiment === 'lead_source';
        const totals = isLeadSource
          ? sumVariants(experiment.variants)
          : sumActiveVariants(experiment.experiment, experiment.variants);
        const showLegend = !isLeadSource;
        const totalLabel = isLeadSource ? 'Итого' : 'Итого (включённые)';
        const rows = [...experiment.variants]
          .sort((a, b) => {
            const aOn = isVariantActive(experiment.experiment, a.variant) ? 0 : 1;
            const bOn = isVariantActive(experiment.experiment, b.variant) ? 0 : 1;
            return aOn - bOn;
          })
          .map((variant) => {
            const name = labels[experiment.experiment]?.[variant.variant] || variant.variant;
            const rank = ranks.get(variant.variant);
            const listedActive = isVariantActive(experiment.experiment, variant.variant);
            const trafficWeight = cachedData?.allocation?.[experiment.experiment]?.weights?.[variant.variant];
            const receivingTraffic =
              listedActive && (typeof trafficWeight !== 'number' || trafficWeight > 0);
            const softRetired = listedActive && typeof trafficWeight === 'number' && trafficWeight === 0;
            const rowClass = [
              rank === 'win' ? 'is-win' : '',
              rank === 'lose' || softRetired ? 'is-lose' : '',
              receivingTraffic ? 'is-active-variant' : 'is-inactive-variant',
            ]
              .filter(Boolean)
              .join(' ');
            const badge =
              rank === 'win'
                ? '<span class="ab-stats__badge ab-stats__badge--win">Лучший</span>'
                : rank === 'lose' && receivingTraffic
                  ? '<span class="ab-stats__badge ab-stats__badge--lose">Слабый</span>'
                  : '';
            const retiredBadge =
              !listedActive || softRetired
                ? '<span class="ab-stats__badge ab-stats__badge--off">Выключен · история</span>'
                : '';
            const status = receivingTraffic
              ? `<span class="ab-stats__lamp ab-stats__lamp--on" title="Вариант включён в тест" aria-label="Включён"></span>`
              : `<span class="ab-stats__lamp ab-stats__lamp--off" title="Вариант выключен, данные только исторические" aria-label="Выключен"></span>`;
            const trafficBadge =
              listedActive && typeof trafficWeight === 'number'
                ? `<span class="ab-stats__traffic" title="Текущая доля новых посетителей">${Math.round(trafficWeight * 100)}% трафика</span>`
                : '';

            return `<tr class="${rowClass}">
              <td class="ab-stats__variant">
                <span class="ab-stats__variant-main">
                  ${status}
                  <span class="ab-stats__variant-name">${name}</span>
                </span>
                ${trafficBadge}
                ${badge}
                ${retiredBadge}
              </td>
              <td class="ab-stats__num ab-stats__col--imp">${variant.impression}</td>
              <td class="ab-stats__num ab-stats__col--click">${variant.click}</td>
              <td class="ab-stats__num ab-stats__col--conv">${variant.conversion}</td>
              <td class="ab-stats__num ab-stats__col--ctr">${variant.ctr}%</td>
              <td class="ab-stats__num ab-stats__col--cvr">${variant.cvr}%</td>
            </tr>`;
          })
          .join('');

        const totalCtr = isLeadSource ? '—' : `${totals.ctr}%`;
        const totalCvr = isLeadSource ? '—' : `${totals.cvr}%`;

        return `<section class="ab-stats__block">
          <div class="ab-stats__block-head">
            <h2>${titles[experiment.experiment] || experiment.experiment}</h2>
            <p class="ab-stats__legend">
              <span class="ab-stats__legend-item ab-stats__legend-item--on">
                <span class="ab-stats__lamp ab-stats__lamp--on" aria-hidden="true"></span>
                Включён
              </span>
              <span class="ab-stats__legend-item ab-stats__legend-item--off">
                <span class="ab-stats__lamp ab-stats__lamp--off" aria-hidden="true"></span>
                Выключен
              </span>
              ${
                showLegend
                  ? `<span class="ab-stats__legend-item ab-stats__legend-item--win">Лучший</span>
              <span class="ab-stats__legend-item ab-stats__legend-item--lose">Слабый</span>`
                  : ''
              }
            </p>
          </div>
          ${
            showLegend && cachedData?.allocation?.[experiment.experiment]
              ? `<p class="ab-stats__alloc-note">${cachedData.allocation[experiment.experiment].reason}. Бейджи «Лучший / Слабый» — по лестнице сигнала (CVR × лиды). При solo слабый получает 0% трафика. Строка «Итого» считает варианты из активного списка.</p>`
              : isLeadSource
                ? '<p class="ab-stats__alloc-note">CVR в строках — конверсия этого источника (заявки / показы источника). Итоговый CTR/CVR здесь не смешивается: у форм разные знаменатели.</p>'
                : experiment.experiment === 'quiz_copy'
                  ? '<p class="ab-stats__alloc-note">3 варианта: контроль текста, новый текст, синяя full-bleed полоса с заголовком внутри. Показ = визит. Клик = «Продолжить/Следующий». Конверсия = заявка с квиза.</p>'
                  : experiment.experiment === 'hero_media'
                    ? '<p class="ab-stats__alloc-note">Фото vs видео в шапке. Показ = визит. Клик = нажатие hero CTA. Конверсия = любая заявка с страницы.</p>'
                  : experiment.experiment === 'bottom_copy'
                    ? '<p class="ab-stats__alloc-note">3 варианта: светлая форма (контроль), другой текст, тёмная full-bleed полоса с тем же текстом контроля. Показ = визит. Клик = отправка. Конверсия = успешная заявка (низ или popup sticky).</p>'
                    : ''
          }
          <div class="ab-stats__table-wrap">
            <table class="ab-stats__table">
              <thead>
                <tr>
                  <th scope="col">Вариант</th>
                  <th scope="col" class="ab-stats__col--imp">Показы</th>
                  <th scope="col" class="ab-stats__col--click">Клики</th>
                  <th scope="col" class="ab-stats__col--conv">Конверсии</th>
                  <th scope="col" class="ab-stats__col--ctr">CTR</th>
                  <th scope="col" class="ab-stats__col--cvr">CVR</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr class="ab-stats__total-row">
                  <th scope="row">${totalLabel}</th>
                  <td class="ab-stats__num ab-stats__col--imp">${totals.impression}</td>
                  <td class="ab-stats__num ab-stats__col--click">${totals.click}</td>
                  <td class="ab-stats__num ab-stats__col--conv">${totals.conversion}</td>
                  <td class="ab-stats__num ab-stats__col--ctr">${totalCtr}</td>
                  <td class="ab-stats__num ab-stats__col--cvr">${totalCvr}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>`;
      })
      .join('');
  }

  function syncUrl() {
    const next = new URLSearchParams(window.location.search);
    if (token) next.set('token', token);
    next.set('channel', activeChannel);
    next.set('preset', rangeState.preset);
    if (rangeState.preset === 'all_time') {
      next.delete('from');
      next.delete('to');
    } else {
      if (rangeState.from) next.set('from', rangeState.from);
      if (rangeState.to) next.set('to', rangeState.to);
    }
    if (rangeState.compare) next.set('compare', '1');
    else next.delete('compare');
    if (rangeState.compare && rangeState.compareFrom && rangeState.compareTo) {
      next.set('compareFrom', rangeState.compareFrom);
      next.set('compareTo', rangeState.compareTo);
    } else {
      next.delete('compareFrom');
      next.delete('compareTo');
    }
    if (chartGrain && chartGrain !== 'day') next.set('grain', chartGrain);
    else next.delete('grain');
    window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
  }

  function updateRangeLabel() {
    const today = jerusalemToday();
    const resolved = resolvePreset(rangeState.preset, today);
    const btnText =
      rangeState.preset === 'all_time'
        ? 'За всё время'
        : resolved.from && resolved.to
          ? `${fmtRu(resolved.from)} — ${fmtRu(resolved.to)}`
          : resolved.label || 'Период';
    if (dateOpenBtn) dateOpenBtn.textContent = btnText;

    let note = '';
    if (rangeState.preset !== 'all_time' && resolved.from && resolved.to) {
      note = resolved.label;
    }
    if (rangeState.compare && resolved.from && resolved.to) {
      const prev =
        rangeState.compareFrom && rangeState.compareTo
          ? { from: rangeState.compareFrom, to: rangeState.compareTo }
          : previousPeriod(resolved.from, resolved.to);
      if (prev) {
        note = note
          ? `${note} · vs ${fmtRu(prev.from)} — ${fmtRu(prev.to)}`
          : `vs ${fmtRu(prev.from)} — ${fmtRu(prev.to)}`;
      }
    }
    if (rangeLabelEl) {
      rangeLabelEl.textContent = note;
      rangeLabelEl.hidden = !note;
    }
  }

  function setActiveChannel(channel) {
    activeChannel = channel === 'all' ? 'all' : 'fb_ads';
    tabButtons.forEach((tab) => {
      const isActive = tab.getAttribute('data-channel') === activeChannel;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (channelNoteEl) channelNoteEl.textContent = channelNotes[activeChannel];
    syncUrl();
  }

  function renderDashboard() {
    if (!rootEl || !cachedData?.primary) return;
    const primary = cachedData.primary;
    const compare = cachedData.compare;
    rootEl.innerHTML = `${renderSoloBanners(cachedData.allocation)}
      ${renderChart(primary.daily, compare?.daily)}
      ${renderWidgetSummary(primary, compare)}
      ${renderExperiments(primary.experiments || [])}`;

    rootEl.querySelectorAll('[data-grain]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-grain') || 'day';
        if (next === chartGrain) return;
        chartGrain = next;
        syncUrl();
        renderDashboard();
      });
    });
  }

  async function loadStats() {
    if (loading) return;
    loading = true;
    try {
      const today = jerusalemToday();
      const resolved = resolvePreset(rangeState.preset, today);
      rangeState.from = resolved.from;
      rangeState.to = resolved.to;

      const query = new URLSearchParams();
      if (token) query.set('token', token);
      query.set('channel', activeChannel);
      query.set('preset', rangeState.preset);
      if (resolved.from && resolved.to) {
        query.set('from', resolved.from);
        query.set('to', resolved.to);
      }
      if (rangeState.compare && resolved.from && resolved.to) {
        query.set('compare', '1');
        const prev =
          rangeState.compareFrom && rangeState.compareTo
            ? { from: rangeState.compareFrom, to: rangeState.compareTo }
            : previousPeriod(resolved.from, resolved.to);
        if (prev) {
          query.set('compareFrom', prev.from);
          query.set('compareTo', prev.to);
          rangeState.compareFrom = prev.from;
          rangeState.compareTo = prev.to;
        }
      }

      syncUrl();
      updateRangeLabel();

      const res = await fetch(`/api/ab-stats?${query.toString()}`, { credentials: 'same-origin' });
      const data = await res.json();

      if (!res.ok || !data.ok || !data.primary) {
        if (statusEl) statusEl.textContent = data.error || 'Не удалось загрузить статистику';
        return;
      }

      cachedData = data;
      if (statusEl) statusEl.textContent = '';
      if (updatedEl && data.updatedAt) {
        updatedEl.textContent = `Обновлено: ${new Date(data.updatedAt).toLocaleString('ru-RU')} · ${data.timezone || TZ}`;
      }
      renderDashboard();
    } catch {
      if (statusEl) statusEl.textContent = 'Ошибка загрузки статистики';
    } finally {
      loading = false;
    }
  }

  function openDateModal() {
    if (!dateModal) return;
    const today = jerusalemToday();
    const resolved = resolvePreset(rangeState.preset, today);
    const draft = {
      preset: rangeState.preset,
      from: resolved.from || shiftDay(today, -29),
      to: resolved.to || today,
      compare: rangeState.compare,
    };

    dateModal.hidden = false;
    dateModal.innerHTML = `
      <div class="ab-stats__modal-backdrop" data-close="1"></div>
      <div class="ab-stats__modal" role="dialog" aria-modal="true" aria-label="Выбор периода">
        <div class="ab-stats__modal-grid">
          <aside class="ab-stats__presets">
            <p class="ab-stats__presets-title">Период</p>
            ${PRESETS.map(
              (p) =>
                `<button type="button" class="ab-stats__preset ${draft.preset === p.id ? 'is-active' : ''}" data-preset="${p.id}">${p.label}</button>`,
            ).join('')}
          </aside>
          <div class="ab-stats__modal-main">
            <label class="ab-stats__compare-toggle">
              <input type="checkbox" id="ab-compare-check" ${draft.compare ? 'checked' : ''} ${draft.preset === 'all_time' ? 'disabled' : ''} />
              Сравнение периодов
            </label>
            <div class="ab-stats__date-inputs">
              <label>С <input type="date" id="ab-from" value="${draft.from}" ${draft.preset === 'all_time' ? 'disabled' : ''} /></label>
              <label>По <input type="date" id="ab-to" value="${draft.to}" ${draft.preset === 'all_time' ? 'disabled' : ''} /></label>
            </div>
            <p class="ab-stats__tz-note">Даты показаны по времени Иерусалима (${TZ}).</p>
            <div class="ab-stats__modal-actions">
              <button type="button" class="ab-stats__btn ab-stats__btn--ghost" data-close="1">Отмена</button>
              <button type="button" class="ab-stats__btn ab-stats__btn--primary" id="ab-date-apply">Обновить</button>
            </div>
          </div>
        </div>
      </div>`;

    const fromInput = dateModal.querySelector('#ab-from');
    const toInput = dateModal.querySelector('#ab-to');
    const compareCheck = dateModal.querySelector('#ab-compare-check');

    dateModal.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.preset = btn.getAttribute('data-preset') || 'last_30_days';
        const next = resolvePreset(draft.preset, today);
        if (next.from && next.to) {
          draft.from = next.from;
          draft.to = next.to;
          fromInput.value = next.from;
          toInput.value = next.to;
        }
        const allTime = draft.preset === 'all_time';
        fromInput.disabled = allTime;
        toInput.disabled = allTime;
        compareCheck.disabled = allTime;
        if (allTime) {
          draft.compare = false;
          compareCheck.checked = false;
        }
        dateModal.querySelectorAll('[data-preset]').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-preset') === draft.preset);
        });
      });
    });

    dateModal.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => {
        dateModal.hidden = true;
        dateModal.innerHTML = '';
      });
    });

    dateModal.querySelector('#ab-date-apply')?.addEventListener('click', () => {
      rangeState.preset = draft.preset;
      if (draft.preset === 'custom' || draft.preset === 'all_time') {
        // keep
      } else if (fromInput.value !== draft.from || toInput.value !== draft.to) {
        rangeState.preset = 'custom';
      }
      if (rangeState.preset !== 'all_time') {
        rangeState.from = fromInput.value;
        rangeState.to = toInput.value;
        if (rangeState.from > rangeState.to) {
          const tmp = rangeState.from;
          rangeState.from = rangeState.to;
          rangeState.to = tmp;
        }
      } else {
        rangeState.from = null;
        rangeState.to = null;
      }
      rangeState.compare = !!compareCheck.checked && rangeState.preset !== 'all_time';
      rangeState.compareFrom = null;
      rangeState.compareTo = null;
      dateModal.hidden = true;
      dateModal.innerHTML = '';
      loadStats();
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveChannel(button.getAttribute('data-channel') || 'fb_ads');
      loadStats();
    });
  });

  dateOpenBtn?.addEventListener('click', openDateModal);

  // Default: last 30 days unless URL says otherwise
  if (!params.get('preset') && !params.get('from')) {
    rangeState.preset = 'last_30_days';
  }

  setActiveChannel(activeChannel);
  updateRangeLabel();
  loadStats();
  window.setInterval(loadStats, 30000);
})();
