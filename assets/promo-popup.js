/* Окно с акцией при заходе на главную «На Крыше» (12.11.2026).
   Тексты, фото, кнопка, расписание и частота показа собираются в Jarvis («Сервис» → «Акции на сайте»). Сервер отдаёт
   сайту в общем ответе /api/site поле promo — акцию, которая подходит под расписание прямо сейчас (или поля нет).
   Этот файл сам вставляет в страницу свои стили и разметку, больше ничего подключать не нужно:
   <script src="assets/promo-popup.js" defer></script> (только на главной).

   Как работает:
   - Главная страница после ответа сервера вызывает window.nkPromo.show(promo). Если скрипт доехал позже ответа,
     данные ждут в window.__nkPromoData, и окно покажется, как только скрипт загрузится.
   - Окно появляется через promo.delay секунд, если к этому моменту гость ещё не открыл бронь, меню или другое окно сайта.
   - Частота (promo.freq): visit — раз за визит (память вкладки), day — раз в сутки, week — раз в неделю, always — при каждом заходе.
     Что окно уже показывали, запоминается в браузере (nk_promo_seen) вместе с версией акции rev: поправили акцию в Jarvis — её снова покажут.
     Если память браузера закрыта, окно просто покажется снова при следующем заходе.
   - Закрывается крестиком, клавишей Esc или нажатием мимо окна. Кнопка: «book», «menu», «vip» открывают окно сайта, «link» — свою ссылку (только https).
   - Слой z-index 1100: выше всех окон сайта и баннера cookie. Страницу под окном не листать; фокус внутри окна (Tab ходит по кругу), после закрытия возвращается назад.
   - «Меньше движения» в системе — без анимации. На печать окно не выводится. */
(function () {
  'use strict';
  if (window.nkPromo) return;

  var SEEN = 'nk_promo_seen';
  var SAFE_IMG = /^https?:\/\/[^\s'"()<>\\]+\/api\/media\/[0-9a-f-]{36}$/i;
  var ID_RE = /^[0-9a-f-]{36}$/i;
  var DAY = 24 * 3600 * 1000;
  var memSeen = {};          // если память вкладки закрыта: помним до перезагрузки страницы
  var shown = false;         // за одну загрузку страницы окно показываем не больше одного раза
  var timer = 0;

  var CSS = [
    '.nk-pm{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;',
    'background:rgba(10,5,3,.78);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);overscroll-behavior:contain;',
    'opacity:0;transition:opacity .35s ease}',
    '.nk-pm.is-in{opacity:1}',
    '.nk-pm-card{position:relative;box-sizing:border-box;width:min(560px,100%);max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);overflow:hidden;',
    'border-radius:24px;border:1px solid rgba(184,115,51,.30);background:#20120A;color:#F4E2D1;outline:0;',
    'box-shadow:0 30px 80px -24px rgba(0,0,0,.9),inset 0 1px 0 rgba(244,226,209,.05);',
    'transform:translateY(18px) scale(.985);transition:transform .45s cubic-bezier(.2,.8,.3,1)}',
    '.nk-pm.is-in .nk-pm-card{transform:none}',
    '.nk-pm-bg{position:absolute;inset:-28px;background-repeat:no-repeat;background-size:cover;opacity:0;transition:opacity .6s ease}',
    '.nk-pm-bg.is-on{opacity:1}',
    '.nk-pm-card.no-img{background:radial-gradient(120% 90% at 50% 0%,rgba(184,115,51,.26),transparent 62%),#20120A}',
    '.nk-pm-veil{position:absolute;inset:0;background:#100906;pointer-events:none}',
    '.nk-pm-x{position:absolute;top:14px;right:14px;z-index:2;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;',
    'background:rgba(16,9,6,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border:1px solid rgba(244,226,209,.25);color:#F4E2D1;cursor:pointer;padding:0;',
    'transition:background .2s,border-color .2s,transform .2s;-webkit-appearance:none;appearance:none}',
    '.nk-pm-x:hover{border-color:#B87333;background:rgba(184,115,51,.2);transform:rotate(90deg)}',
    '.nk-pm-in{position:relative;z-index:1;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;',
    'min-height:340px;padding:64px 36px 44px;overflow-wrap:anywhere}',
    ".nk-pm-k{font-family:'Jost',sans-serif;font-size:12.5px;letter-spacing:3px;text-transform:uppercase;color:#CD8C4F;margin:0 0 16px}",
    ".nk-pm-t{font-family:'Jost',sans-serif;font-weight:400;letter-spacing:.3px;font-size:clamp(28px,6.4vw,42px);line-height:1.12;margin:0;color:#F4E2D1;text-wrap:balance}",
    ".nk-pm-p{font-family:'Jost',sans-serif;font-weight:500;font-size:clamp(21px,4.8vw,30px);line-height:1.25;margin:18px 0 0;color:#E5B07A;text-wrap:balance}",
    ".nk-pm-n{font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.6;margin:16px 0 0;color:#C9A880;max-width:42ch}",
    ".nk-pm-b{margin-top:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:100px;padding:15px 32px;cursor:pointer;text-decoration:none;",
    "font-family:'Inter',system-ui,sans-serif;font-size:13.5px;font-weight:500;letter-spacing:1px;text-transform:uppercase;border:1px solid transparent;",
    'background:linear-gradient(135deg,#CD8C4F 0%,#B87333 55%,#A6672E 100%);color:#1E1004;-webkit-appearance:none;appearance:none;max-width:100%;',
    'box-shadow:0 8px 22px -10px rgba(184,115,51,.65),inset 0 1px 0 rgba(255,255,255,.12);',
    'transition:transform .22s cubic-bezier(.2,.8,.3,1),filter .2s,box-shadow .25s}',
    '.nk-pm-b:hover{filter:brightness(1.08);transform:translateY(-2px);box-shadow:0 12px 28px -10px rgba(184,115,51,.8),inset 0 1px 0 rgba(255,255,255,.16)}',
    '.nk-pm-b:active{transform:scale(.97)}',
    '.nk-pm-x:focus-visible,.nk-pm-b:focus-visible{outline:2px solid #CD8C4F;outline-offset:3px}',
    'html.nk-pm-lock{overflow:hidden}',
    '@media (max-width:560px){.nk-pm{padding:14px}.nk-pm-card{border-radius:20px;max-height:calc(100vh - 28px);max-height:calc(100dvh - 28px)}',
    '.nk-pm-in{min-height:300px;padding:60px 22px 32px}.nk-pm-b{width:100%;padding:16px 20px}}',
    '@media (max-height:520px){.nk-pm-card{overflow-y:auto}.nk-pm-in{min-height:0;padding-top:56px}}',
    '@media (prefers-reduced-motion:reduce){.nk-pm,.nk-pm-bg{transition:opacity .2s}.nk-pm-card{transform:none;transition:none}.nk-pm-x:hover,.nk-pm-b:hover{transform:none}}',
    '@media print{.nk-pm{display:none}}'
  ].join('');

  // ── что уже показывали ──
  function readSeen() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(SEEN) || '{}') || {}; } catch (e) { o = {}; }
    var s = {};
    try { s = JSON.parse(sessionStorage.getItem(SEEN) || '{}') || {}; } catch (e) { s = {}; }
    return { local: o, session: s };
  }
  function seenBefore(p) {
    var r = readSeen(), now = Date.now();
    if (p.freq === 'always') return false;
    if (p.freq === 'visit') {
      var v = r.session[p.id] || memSeen[p.id];
      return !!(v && v.rev === p.rev);
    }
    var e = r.local[p.id];
    if (!e || e.rev !== p.rev || !isFinite(e.t)) return false;
    return (now - e.t) < (p.freq === 'week' ? 7 * DAY : DAY);
  }
  function markSeen(p) {
    var rec = { rev: p.rev, t: Date.now() };
    memSeen[p.id] = rec;
    try {
      var s = JSON.parse(sessionStorage.getItem(SEEN) || '{}') || {};
      s[p.id] = rec; sessionStorage.setItem(SEEN, JSON.stringify(s));
    } catch (e) { /* память вкладки закрыта: останется memSeen */ }
    try {
      var o = JSON.parse(localStorage.getItem(SEEN) || '{}') || {};
      o[p.id] = rec;
      var keys = Object.keys(o);
      if (keys.length > 12) keys.sort(function (a, b) { return (o[a].t || 0) - (o[b].t || 0); }).slice(0, keys.length - 12).forEach(function (k) { delete o[k]; });
      localStorage.setItem(SEEN, JSON.stringify(o));
    } catch (e) { /* память браузера закрыта: окно покажется снова при следующем заходе */ }
  }

  // ── проверка того, что пришло с сервера: на сайт попадает только текст и известные поля ──
  var str = function (v, n) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : ''; };
  function clean(p) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !ID_RE.test(p.id)) return null;
    var o = {
      id: p.id, rev: Number(p.rev) || 0,
      kicker: str(p.kicker, 30), title: str(p.title, 80), text: str(p.text, 120), note: str(p.note, 160),
      freq: ['visit', 'day', 'week', 'always'].indexOf(p.freq) >= 0 ? p.freq : 'day',
      delay: Math.min(30, Math.max(0, Math.round(Number(p.delay)))) || 0,
      img: null, btn: null
    };
    if (!o.title && !o.text) return null;
    var num = function (v, d) { v = Number(v); return isFinite(v) ? v : d; };
    if (p.img && typeof p.img.url === 'string' && SAFE_IMG.test(p.img.url)) {
      o.img = { url: p.img.url, blur: Math.min(20, Math.max(0, num(p.img.blur, 0))), veil: Math.min(80, Math.max(0, num(p.img.veil, 45))),
        fx: Math.min(100, Math.max(0, num(p.img.fx, 50))), fy: Math.min(100, Math.max(0, num(p.img.fy, 50))) };
    }
    if (p.btn && typeof p.btn === 'object') {
      var a = p.btn.action, label = str(p.btn.label, 24);
      if ((a === 'book' || a === 'menu' || a === 'vip') && label) o.btn = { action: a, label: label };
      else if (a === 'link' && label && typeof p.btn.url === 'string' && /^https:\/\/[^\s'"<>\\]+$/i.test(p.btn.url)) o.btn = { action: 'link', label: label, url: p.btn.url };
    }
    return o;
  }

  function otherLayerOpen() {
    try { return !!document.querySelector('#vip.is-open,#spaces.is-open,#menu.is-open,#booking.is-open,#event.is-open,#navDrawer.open'); } catch (e) { return false; }
  }

  function build(p) {
    if (!document.getElementById('nk-pm-css')) {
      var st = document.createElement('style'); st.id = 'nk-pm-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    var root = el('div', 'nk-pm');
    var card = el('div', 'nk-pm-card' + (p.img ? '' : ' no-img'));
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.tabIndex = -1;
    var bg = null;
    if (p.img) {
      bg = el('div', 'nk-pm-bg');
      bg.style.backgroundImage = 'url("' + p.img.url + '")';
      bg.style.backgroundPosition = p.img.fx + '% ' + p.img.fy + '%';
      if (p.img.blur) bg.style.filter = 'blur(' + p.img.blur + 'px)';
      var veil = el('div', 'nk-pm-veil'); veil.style.opacity = String(p.img.veil / 100);
      card.appendChild(bg); card.appendChild(veil);
    }
    var x = el('button', 'nk-pm-x'); x.type = 'button'; x.setAttribute('aria-label', 'Закрыть');
    x.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var inn = el('div', 'nk-pm-in');
    if (p.kicker) inn.appendChild(el('p', 'nk-pm-k', p.kicker));
    var t = null;
    if (p.title) { t = el('h2', 'nk-pm-t', p.title); t.id = 'nkPmTitle'; inn.appendChild(t); }
    if (p.text) inn.appendChild(el('p', 'nk-pm-p', p.text));
    if (p.note) inn.appendChild(el('p', 'nk-pm-n', p.note));
    if (t) card.setAttribute('aria-labelledby', 'nkPmTitle'); else card.setAttribute('aria-label', p.kicker || 'Акция');
    var b = null;
    if (p.btn) {
      if (p.btn.action === 'link') { b = el('a', 'nk-pm-b', p.btn.label); b.href = p.btn.url; b.target = '_blank'; b.rel = 'noopener noreferrer'; }
      else { b = el('button', 'nk-pm-b', p.btn.label); b.type = 'button'; }
      inn.appendChild(b);
    }
    card.appendChild(x); card.appendChild(inn); root.appendChild(card);
    return { root: root, card: card, bg: bg, x: x, b: b };
  }

  function open(p) {
    if (shown || document.querySelector('.nk-pm')) return;
    shown = true;
    markSeen(p);
    var ui = build(p);
    var prevFocus = document.activeElement;
    var closed = false;
    function close(after) {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      document.documentElement.classList.remove('nk-pm-lock');
      ui.root.classList.remove('is-in');
      var done = function () {
        if (ui.root.parentNode) ui.root.parentNode.removeChild(ui.root);
        if (typeof after === 'function') after();
        else if (prevFocus && document.contains(prevFocus) && prevFocus.focus) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* не страшно */ } }
      };
      // под «меньше движения» и без перехода слой убираем сразу, иначе подождём конец плавного ухода
      if (after) { if (ui.root.parentNode) ui.root.parentNode.removeChild(ui.root); after(); } else setTimeout(done, 340);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var list = [ui.x]; if (ui.b) list.push(ui.b);
      var i = list.indexOf(document.activeElement);
      e.preventDefault();
      // фокус стоит на самом окне (i = -1): вперёд — на крестик, назад — на последнюю кнопку
      list[i < 0 ? (e.shiftKey ? list.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
    }
    ui.x.addEventListener('click', function () { close(); });
    ui.root.addEventListener('mousedown', function (e) { if (e.target === ui.root) close(); });
    ui.root.addEventListener('touchend', function (e) { if (e.target === ui.root) { e.preventDefault(); close(); } });
    if (ui.b) {
      ui.b.addEventListener('click', function () {
        var a = p.btn.action;
        if (a === 'link') { close(); return; }   // ссылка откроется сама, в новой вкладке; слой убираем после короткого ухода
        // окно сайта открываем после того, как наше убрано и страница разблокирована
        close(function () {
          var id = a === 'book' ? 'booking' : a === 'menu' ? 'menu' : 'vip';
          try { if (typeof window.openOverlay === 'function') window.openOverlay(id); else location.hash = '#' + id; } catch (e) { /* окно сайта не открылось: гость остаётся на странице */ }
        });
      });
    }
    document.addEventListener('keydown', onKey, true);
    document.documentElement.classList.add('nk-pm-lock');
    document.body.appendChild(ui.root);
    // картинка уже грузится с момента показа акции; подставляем её плавно, когда она готова
    if (ui.bg) {
      var im = new Image();
      im.onload = function () { ui.bg.classList.add('is-on'); };
      im.onerror = function () { ui.card.classList.add('no-img'); };
      im.src = p.img.url;
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      ui.root.classList.add('is-in');
      try { ui.card.focus({ preventScroll: true }); } catch (e) { /* не страшно */ }   // на само окно: читалка экрана назовёт заголовок, кольца фокуса на кнопке нет
    }); });
  }

  function show(raw) {
    if (shown || timer) return;
    var p = clean(raw);
    if (!p || seenBefore(p)) return;
    // фото начинает грузиться сразу, пока идёт задержка
    if (p.img) { try { var pre = new Image(); pre.src = p.img.url; } catch (e) { /* не страшно */ } }
    timer = setTimeout(function () {
      timer = 0;
      if (otherLayerOpen() || document.querySelector('.nk-pm')) return;   // гость уже что-то открыл: не мешаем
      if (document.hidden) {            // вкладка в фоне: покажем, когда вернётся
        var onVis = function () { if (!document.hidden) { document.removeEventListener('visibilitychange', onVis); if (!otherLayerOpen()) open(p); } };
        document.addEventListener('visibilitychange', onVis);
        return;
      }
      open(p);
    }, p.delay * 1000);
  }

  window.nkPromo = { show: show };
  if (window.__nkPromoData !== undefined) { var d = window.__nkPromoData; window.__nkPromoData = undefined; show(d); }
})();
