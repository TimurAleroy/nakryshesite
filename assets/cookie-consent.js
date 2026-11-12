/* Уведомление о cookie «На Крыше» (12.11.2026).
   Один файл на все страницы сайта (главная, карьера, политика): сам вставляет в страницу свои стили и разметку,
   больше ничего подключать не нужно. Подключается строкой <script src="assets/cookie-consent.js" defer></script>
   (на странице политики — с «../» впереди).

   Как работает:
   - Показывается один раз: после нажатия «Принимаю» запоминается в браузере на 12 месяцев (localStorage, ключ nk_cookie_ok).
     Если память браузера закрыта (приватное окно, запрет), отметка уходит во временный cookie с тем же именем;
     если закрыто и это, баннер просто покажется снова при следующем заходе.
   - Ссылка на политику строится от адреса самого файла: assets/cookie-consent.js → privacy/. Поэтому работает и на
     адресе github.io/…/nakryshesite/, и после переезда на свой домен, ничего менять не надо.
   - Слой z-index 160: выше нижней панели телефона (150), ниже окон бронирования, меню и ВИП (200+).
   - Фокус страницы баннер не забирает; кнопка и ссылка доступны с клавиатуры. «Меньше движения» в системе — без анимации. */
(function () {
  'use strict';
  if (window.__nkCookie) return;
  window.__nkCookie = true;

  var KEY = 'nk_cookie_ok';
  var TTL = 365 * 24 * 3600 * 1000;

  var me = document.currentScript || document.querySelector('script[src*="cookie-consent.js"]');
  var src = (me && me.src) || location.href;
  var policy = 'privacy/', cpath = '/', onPolicy = false;
  try {
    var pu = new URL('../privacy/', src);
    policy = pu.href;
    cpath = new URL('../', src).pathname;
    onPolicy = location.pathname.replace(/index\.html$/, '') === pu.pathname;
  } catch (e) { /* адрес не разобрался: останется относительная ссылка */ }

  function read() {
    var t = 0;
    try { t = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { /* память браузера закрыта */ }
    if (!t) {
      try {
        var m = document.cookie.match(/(?:^|;\s*)nk_cookie_ok=(\d+)/);
        if (m) t = parseInt(m[1], 10) || 0;
      } catch (e) { /* cookie закрыты */ }
    }
    if (!t) { try { t = parseInt(sessionStorage.getItem(KEY), 10) || 0; } catch (e) { /* пусто */ } }
    return t;
  }
  function accepted() {
    var t = read();
    return !!t && (Date.now() - t) < TTL;
  }
  function save() {
    var now = String(Date.now()), ok = false;
    try { localStorage.setItem(KEY, now); ok = true; } catch (e) { /* пробуем cookie */ }
    if (!ok) {
      try { document.cookie = KEY + '=' + now + '; max-age=' + (TTL / 1000) + '; path=' + cpath + '; SameSite=Lax'; } catch (e) { /* не вышло */ }
    }
    try { sessionStorage.setItem(KEY, now); } catch (e) { /* не страшно */ }
  }

  var CSS = [
    '.nk-ck{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));z-index:160;box-sizing:border-box;',
    'width:min(900px,calc(100% - 40px));display:flex;align-items:center;justify-content:space-between;gap:24px;',
    'padding:18px 20px 18px 28px;border-radius:22px;background:rgba(32,18,10,.97);border:1px solid rgba(184,115,51,.30);',
    'box-shadow:0 22px 60px -20px rgba(0,0,0,.85),inset 0 1px 0 rgba(244,226,209,.05);',
    "font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;",
    'opacity:0;transform:translate(-50%,18px);',
    'transition:opacity .45s cubic-bezier(.2,.8,.3,1),transform .45s cubic-bezier(.2,.8,.3,1)}',
    '.nk-ck.is-in{opacity:1;transform:translate(-50%,0)}',
    '.nk-ck.is-out{opacity:0;transform:translate(-50%,12px)}',
    '.nk-ck-t{margin:0;font-size:14.5px;line-height:1.6;color:#C9A880}',
    '.nk-ck-a{display:inline-block;margin-top:2px;color:#F4E2D1;text-decoration:underline;',
    'text-decoration-color:rgba(244,226,209,.4);text-underline-offset:3px;border-radius:4px;transition:color .2s,text-decoration-color .2s}',
    '.nk-ck-a:hover{color:#CD8C4F;text-decoration-color:currentColor}',
    ".nk-ck-b{flex-shrink:0;cursor:pointer;font:500 14.5px/1 'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:#F4E2D1;",
    'padding:15px 28px;border-radius:100px;background:rgba(184,115,51,.14);border:1px solid rgba(184,115,51,.45);',
    'transition:background .25s,border-color .25s,transform .2s;-webkit-appearance:none;appearance:none}',
    '.nk-ck-b:hover{background:rgba(184,115,51,.26);border-color:#B87333}',
    '.nk-ck-b:active{transform:scale(.97)}',
    '.nk-ck-a:focus-visible,.nk-ck-b:focus-visible{outline:2px solid #CD8C4F;outline-offset:3px}',
    '@media (max-width:560px){',
    '.nk-ck{width:calc(100% - 24px);bottom:calc(12px + env(safe-area-inset-bottom,0px));flex-direction:column;align-items:stretch;',
    'gap:14px;padding:18px 18px 16px;border-radius:20px}',
    '.nk-ck-t{font-size:13.5px}',
    '.nk-ck-b{width:100%;padding:14px 20px}}',
    '@media (prefers-reduced-motion:reduce){.nk-ck{transition:opacity .2s;transform:translate(-50%,0)}',
    '.nk-ck.is-out{transform:translate(-50%,0)}}',
    '@media print{.nk-ck{display:none}}'
  ].join('');

  function show() {
    if (accepted() || document.querySelector('.nk-ck')) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var box = document.createElement('div');
    box.className = 'nk-ck';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Использование файлов cookie');

    var p = document.createElement('p');
    p.className = 'nk-ck-t';
    p.appendChild(document.createTextNode('Продолжая пользоваться сайтом, вы соглашаетесь на использование файлов cookie. '));
    var a = document.createElement('a');
    a.className = 'nk-ck-a';
    a.href = policy;
    a.textContent = 'Политика конфиденциальности';
    if (!onPolicy) { a.target = '_blank'; a.rel = 'noopener'; }
    p.appendChild(a);

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nk-ck-b';
    b.textContent = 'Принимаю';
    b.addEventListener('click', function () {
      save();
      box.classList.remove('is-in');
      box.classList.add('is-out');
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 450);
    });

    box.appendChild(p);
    box.appendChild(b);
    document.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('is-in'); }); });
  }

  function start() { setTimeout(show, 700); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
