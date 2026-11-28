(function () {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  var HP_NAME = 'pm_hp_url';
  var turnstilePromise = null;
  var widgetId = null;

  function injectHoneypots() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      if (form.querySelector('input[name="' + HP_NAME + '"]')) continue;
      var input = document.createElement('input');
      input.type = 'text';
      input.name = HP_NAME;
      input.tabIndex = -1;
      input.autocomplete = 'off';
      input.setAttribute('aria-hidden', 'true');
      input.style.cssText =
        'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      form.appendChild(input);
    }
  }

  function getHoneypotValue() {
    var inputs = document.querySelectorAll('input[name="' + HP_NAME + '"]');
    for (var i = 0; i < inputs.length; i++) {
      var val = (inputs[i].value || '').trim();
      if (val) return val;
    }
    return '';
  }

  function getSiteKey() {
    var meta = document.querySelector('meta[name="pm-turnstile-site-key"]');
    return meta ? (meta.getAttribute('content') || '').trim() : '';
  }

  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstilePromise) return turnstilePromise;
    turnstilePromise = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = function () {
        resolve(window.turnstile || null);
      };
      s.onerror = function () {
        resolve(null);
      };
      document.head.appendChild(s);
    });
    return turnstilePromise;
  }

  function getTurnstileToken() {
    var siteKey = getSiteKey();
    if (!siteKey) return Promise.resolve('');
    return loadTurnstileScript().then(function (ts) {
      if (!ts) return '';
      return new Promise(function (resolve) {
        var container = document.getElementById('pm-turnstile-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'pm-turnstile-container';
          container.style.cssText = 'position:fixed;bottom:0;right:0;width:0;height:0;overflow:hidden;';
          document.body.appendChild(container);
        }
        var settled = false;
        var timer = setTimeout(function () {
          if (!settled) {
            settled = true;
            resolve('');
          }
        }, 6000);

        function finish(token) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(token || '');
        }

        if (widgetId !== null) {
          try {
            ts.reset(widgetId);
            ts.execute(widgetId);
            return;
          } catch (e) {
            widgetId = null;
          }
        }

        widgetId = ts.render(container, {
          sitekey: siteKey,
          execution: 'execute',
          appearance: 'interaction-only',
          callback: function (token) {
            finish(token);
          },
          'error-callback': function () {
            finish('');
          },
          'expired-callback': function () {
            finish('');
          },
        });
        ts.execute(widgetId);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHoneypots);
  } else {
    injectHoneypots();
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url ? input.url : '';
    var method = (init && init.method ? init.method : 'GET').toUpperCase();
    if (url.indexOf('/api/contact') === -1 || method !== 'POST' || !init || typeof init.body !== 'string') {
      return origFetch(input, init);
    }

    var hp = getHoneypotValue();
    return getTurnstileToken().then(function (token) {
      try {
        var parsed = JSON.parse(init.body);
        if (hp) parsed.hp = hp;
        if (token) parsed.turnstileToken = token;
        var nextInit = Object.assign({}, init, { body: JSON.stringify(parsed) });
        return origFetch(input, nextInit);
      } catch (e) {
        return origFetch(input, init);
      }
    });
  };
})();
