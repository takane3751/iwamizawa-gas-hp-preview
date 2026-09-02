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

  /* ---------- 緊急表示モード ----------
     プレビューでは localStorage / ?emergency=1 で切替。
     実運用では気象庁 XML（地震情報）を受信するサーバー側処理が
     フラグを立て、全ページがこの状態に切り替わる想定。 */
  var KEY = 'iwg_emergency_mode';
  var qs = new URLSearchParams(location.search);
  if (qs.has('emergency')) {
    try { localStorage.setItem(KEY, qs.get('emergency') === '0' ? '0' : '1'); } catch (_) {}
  }
  var isEm = false;
  try { isEm = localStorage.getItem(KEY) === '1'; } catch (_) {}

  var alertBar = document.getElementById('alertBar');
  var sw = document.getElementById('emergencySwitch');
  function applyEmergency(on) {
    document.body.classList.toggle('is-emergency', on);
    if (alertBar) alertBar.hidden = !on;
    if (sw) sw.checked = on;
    // お知らせ一覧の先頭を強調（ページ側に .js-em-news があれば）
    document.querySelectorAll('.js-em-news').forEach(function (li) {
      li.classList.toggle('is-urgent', on);
      li.hidden = !on;
    });
    setHeaderBottom();
  }
  applyEmergency(isEm);
  if (sw) {
    sw.addEventListener('change', function () {
      try { localStorage.setItem(KEY, sw.checked ? '1' : '0'); } catch (_) {}
      applyEmergency(sw.checked);
    });
  }

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
      out.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- 開栓・閉栓 希望日の最小値（4営業日後の目安） ---------- */
  var d = document.querySelector('input[type="date"][data-min-days]');
  if (d) {
    var days = parseInt(d.dataset.minDays, 10) || 0;
    var t = new Date(); t.setDate(t.getDate() + days);
    d.min = t.toISOString().slice(0, 10);
  }
})();
