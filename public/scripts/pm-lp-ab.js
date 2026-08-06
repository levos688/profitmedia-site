(function () {
  var STORAGE_KEY = 'pm_lp_order_v1';
  var SKIP_KEY = 'pm_ab_skip';
  var ORDER_VARIANTS = ['proof_first', 'mechanism_first'];

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

  function getOrder() {
    var value = document.documentElement.dataset.pmLpOrder || '';
    if (ORDER_VARIANTS.indexOf(value) !== -1) return value;
    try {
      value = localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {}
    return ORDER_VARIANTS.indexOf(value) !== -1 ? value : ORDER_VARIANTS[0];
  }

  function getKeyword() {
    var root = document.querySelector('[data-lp-keyword]');
    return root && root.dataset.lpKeyword ? root.dataset.lpKeyword : 'unknown';
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

  function eventsFor(metric) {
    return [
      { experiment: 'page_order', variant: getOrder(), metric: metric },
      { experiment: 'landing_keyword', variant: getKeyword(), metric: metric },
    ];
  }

  function trackConversion() {
    return trackEvents(eventsFor('conversion'));
  }

  function init() {
    trackEvents(eventsFor('impression'));
    document.addEventListener(
      'click',
      function (event) {
        var target = event.target && event.target.closest
          ? event.target.closest('[data-lead-modal-open], .sticky-cta button, a[href="#contact"]')
          : null;
        if (target) trackEvents(eventsFor('click'));
      },
      { passive: true },
    );
  }

  window.pmLpAb = {
    getOrder: getOrder,
    getKeyword: getKeyword,
    trackConversion: trackConversion,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
