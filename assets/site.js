/* 岩見沢ガス HP プレビュー版 共通スクリプト */
(function () {
  'use strict';

  /* ---------- ナビ現在地 ---------- */
  var page = document.body.dataset.page || '';
  var navKey = page.split('-')[0];             // service-area → service
  document.querySelectorAll('[data-nav]').forEach(function (a) {
    if (a.dataset.nav === navKey) a.classList.add('is-active');
  });

  /* ---------- ヘッダー高さ → モバイルメニューの開始位置 ---------- */
  var header = document.getElementById('header');
  function setHeaderBottom() {
    var r = header.getBoundingClientRect();
    document.documentElement.style.setProperty('--header-bottom', (r.bottom) + 'px');
  }
  setHeaderBottom();
  window.addEventListener('resize', setHeaderBottom);
  window.addEventListener('scroll', setHeaderBottom, { passive: true });

  /* ---------- ハンバーガーメニュー ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      document.body.style.overflow = open ? 'hidden' : '';
      setHeaderBottom();
    });
  }

  /* ---------- 電話番号タップ時の確認（スマホ要望） ----------
     iOSは標準で確認が出るが、Androidや一部ブラウザでは即ダイヤラーが開くため
     どの端末でも「電話をかけますか？」を挟む。 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.js-tel, a[href^="tel:"]');
    if (!a) return;
    var num = a.getAttribute('href').replace('tel:', '');
    var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
    var ok = window.confirm('電話をかけますか？\n\n' + label + '\n' + num);
    if (!ok) e.preventDefault();
  });

  /* ---------- 災害時の表示（段階別） ----------
     プレビューでは PREVIEW パネル / URL で切替。
       ?level=4 | 5- | 5+ | snow | manual | off
       ?emergency=1 は旧URL互換（manual と同じ）、?emergency=0 は off
     実運用では気象庁 XML（震度・大雪）を受信するサーバー側処理が段階を決め、
     担当者が手動で出した表示（manual）があればそちらを優先する想定。 */
  var LEVEL_KEY = 'iwg_emergency_level';
  var LEVELS = {
    off: null,
    '4': { tone: 'notice', hero: false, icon: 'i-alert', label: 'お知らせ',
      text: '岩見沢市で震度4の地震がありました（出典：気象庁）。ガスの臭いがしたら火を使わずにご連絡ください。ガスが出ないときは、メーターの復帰方法をご覧ください。',
      link: '復帰方法・連絡先を見る', href: 'emergency.html#recover', news: null },
    '5-': { tone: 'alert', hero: true, icon: 'i-alert', label: '地震の情報',
      text: '岩見沢市で震度5弱の地震がありました（出典：気象庁）。当社で状況を確認中です。',
      link: 'ガスが出ない・臭いがするとき', href: 'emergency.html',
      news: '【地震】震度5弱の地震を受けて状況を確認しています' },
    '5+': { tone: 'alert', hero: true, icon: 'i-alert', label: '地震の情報',
      text: '岩見沢市で震度6弱の地震がありました（出典：気象庁）。一部の地域でガスの供給を停止している可能性があります。確認ができ次第お知らせします。',
      link: 'いまできること・連絡先', href: 'emergency.html',
      news: '【地震】供給停止の可能性と、確認の状況について' },
    snow: { tone: 'notice', hero: false, icon: 'i-snow', label: '大雪のお知らせ',
      text: '岩見沢市で大雪となっています（出典：気象庁）。一酸化炭素中毒を防ぐため、給排気口やガスメーターのまわりの除雪をお願いします。',
      link: '冬季の注意を見る', href: 'emergency.html#blackout', news: null },
    manual: { tone: 'alert', hero: true, icon: 'i-alert', label: '緊急情報',
      text: '地震の影響により一部地域でガスの供給を停止しています。復旧状況は災害・緊急時ページをご確認ください。',
      link: '供給状況・復帰手順を見る', href: 'emergency.html',
      news: '【緊急】地震の影響による供給停止と復旧状況について' }
  };
  var qs = new URLSearchParams(location.search);
  var urlLevel = qs.has('level') ? qs.get('level').replace(' ', '+')   // ?level=5+ の + は空白で届く
               : qs.has('emergency') ? (qs.get('emergency') === '0' ? 'off' : 'manual') : null;
  if (urlLevel && urlLevel in LEVELS) {
    try { localStorage.setItem(LEVEL_KEY, urlLevel); } catch (_) {}
  }
  var level = 'off';
  try {
    var saved = localStorage.getItem(LEVEL_KEY);
    if (saved === null && localStorage.getItem('iwg_emergency_mode') === '1') saved = 'manual'; // 旧スイッチの状態を引き継ぐ
    if (saved in LEVELS) level = saved;
  } catch (_) {}
  if (urlLevel && urlLevel in LEVELS) level = urlLevel;

  var alertBar = document.getElementById('alertBar');
  var radios = document.querySelectorAll('input[name="emLevel"]');
  function setText(id, s) { var el = document.getElementById(id); if (el) el.textContent = s; }
  function applyLevel(lv) {
    var cfg = LEVELS[lv];
    var hero = !!(cfg && cfg.hero);
    document.body.dataset.em = cfg ? lv : '';
    document.body.classList.toggle('is-emergency', hero);
    if (alertBar) {
      alertBar.hidden = !cfg;
      if (cfg) {
        alertBar.className = 'alert-bar alert-bar--' + cfg.tone;
        setText('alertLabel', cfg.label);
        setText('alertText', cfg.text);
        setText('alertLink', cfg.link);
        document.getElementById('alertLink').setAttribute('href', cfg.href);
        document.getElementById('alertIcon').setAttribute('href', '#' + cfg.icon);
      }
    }
    radios.forEach(function (r) { r.checked = r.value === lv; });
    // お知らせ一覧の先頭に緊急行を出す（TOP を切り替える段階のみ）
    document.querySelectorAll('.js-em-news').forEach(function (li) {
      var on = !!(cfg && cfg.news);
      li.classList.toggle('is-urgent', on);
      li.hidden = !on;
      var ttl = li.querySelector('.js-em-news-ttl');
      if (on && ttl) ttl.textContent = cfg.news;
    });
    setHeaderBottom();
  }
  applyLevel(level);
  radios.forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      try { localStorage.setItem(LEVEL_KEY, r.value); } catch (_) {}
      applyLevel(r.value);
    });
  });

  /* ---------- プレビューパネル開閉 ---------- */
  var pt = document.getElementById('previewToggle');
  if (pt) {
    var body = pt.nextElementSibling;
    pt.addEventListener('click', function () {
      var open = body.hidden;
      body.hidden = !open;
      pt.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- お知らせのカテゴリ絞り込み ---------- */
  var filter = document.querySelector('.news-filter');
  if (filter) {
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      filter.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      var cat = b.dataset.cat;
      document.querySelectorAll('.news-list > li').forEach(function (li) {
        if (li.classList.contains('js-em-news')) return; // 緊急行はモードに従う
        li.hidden = !(cat === 'all' || li.dataset.cat === cat);
      });
    });
  }

  /* ---------- デモ用フォーム送信 ---------- */
  document.querySelectorAll('form.js-demo-form').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      f.classList.add('is-done');
      f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- 埋設管照会 ログインデモ ---------- */
  var login = document.getElementById('pipeLogin');
  if (login) {
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = document.getElementById('pipeResult');
      out.hidden = false;
      out.style.display = 'block';
      out.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- ヘッダー：スクロールで影 ---------- */
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 文字サイズ切替（標準／大） ---------- */
  var fsButtons = document.querySelectorAll('[data-fs]');
  function applyFs(size) {
    document.documentElement.classList.toggle('fs-lg', size === 'lg');
    fsButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.fs === size ? 'true' : 'false'); });
    setHeaderBottom();
  }
  applyFs(document.documentElement.classList.contains('fs-lg') ? 'lg' : 'md');
  fsButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      try { localStorage.setItem('iwg_fs', b.dataset.fs); } catch (_) {}
      applyFs(b.dataset.fs);
    });
  });

  /* ---------- スクロールでふわっと表示 ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (/[?&]noanim/.test(location.search)) {
    reveals.forEach(function (el) { el.style.transition = 'none'; el.classList.add('is-in'); });
  } else if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
    // 画面内に最初からあるものは即表示（スクリーンショット・印刷でも欠けないように）
    setTimeout(function () { reveals.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); }); }, 50);
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 開栓・閉栓 希望日の最小値（4営業日後の目安） ---------- */
  var d = document.querySelector('input[type="date"][data-min-days]');
  if (d) {
    var days = parseInt(d.dataset.minDays, 10) || 0;
    var t = new Date(); t.setDate(t.getDate() + days);
    d.min = t.toISOString().slice(0, 10);
  }
})();
