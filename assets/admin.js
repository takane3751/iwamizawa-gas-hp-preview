/* 災害情報 担当者画面（デモ）
   実運用ではサーバー（Cloudflare Workers ＋ D1/KV ＋ R2）に保存する。
   デモではこの端末の localStorage に保存し、公開ページ（emergency.html）が同じ値を読んで表示する。 */
(function () {
  'use strict';

  var K = { level: 'iwg_emergency_level', posts: 'iwg_demo_posts', supply: 'iwg_demo_supply', log: 'iwg_demo_log', login: 'iwg_demo_login' };
  var AREAS = ['東地区', '西地区', '南地区', '北地区'];
  var STATES = ['通常供給', '供給停止', '復旧作業中', '復旧済み'];
  var LV = {
    off: ['通常の表示', '災害時の表示は出ていません', ''],
    '4': ['震度4：お知らせ帯', '全ページの上部に帯を表示中', 'is-notice'],
    '5-': ['震度5弱：状況確認中', 'TOPを「状況確認中」に切替中', 'is-alert'],
    '5+': ['震度5強以上：強い表示', 'TOPを強い表示に切替中', 'is-alert'],
    snow: ['大雪：お知らせ帯', '除雪のお願いを表示中', 'is-notice'],
    manual: ['供給停止（手動）', '担当者が出した確定情報を表示中', 'is-alert']
  };
  var TPL = {
    check: ['【地震】ガスの供給状況を確認しています', '本日の地震を受けて、当社で供給設備の状況を確認しています。\nガスが出ない場合は、メーターの復帰方法をお試しください。ガスの臭いがする場合は、火を使わずにすぐご連絡ください。'],
    meter: ['ガスが止まったときのメーターの復帰方法', '地震でガスメーターが自動で止まっている場合があります。添付の手順書のとおりに操作すると、約3分で使えるようになります。'],
    work: ['【復旧作業中】地区の供給再開に向けて作業しています', '現在、供給を停止している地区で復旧作業を行っています。作業員がご家庭に伺い、安全を確認してから再開します。再開の見込みは決まり次第お知らせします。'],
    done: ['【復旧】ガスの供給を再開しました', '供給を停止していた地区で、ガスの供給を再開しました。ご協力ありがとうございました。ガスが出ない場合はメーターの復帰方法をお試しください。']
  };

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { var d = new Date(); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600); }
  function addLog(msg) { var l = load(K.log, []); l.unshift({ t: now(), m: msg }); save(K.log, l.slice(0, 50)); }

  /* ---------- ログイン ---------- */
  function enter() { $('scrLogin').hidden = true; $('app').hidden = false; renderAll(); }
  if (load(K.login, false)) enter();
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('codeStep').hidden) { $('codeStep').hidden = false; $('loginBtn').textContent = 'ログイン'; $('codeStep').querySelector('input').focus(); return; }
    save(K.login, true); enter();
  });

  /* ---------- タブ ---------- */
  function go(tab) {
    ['home', 'post', 'supply', 'log'].forEach(function (t) { $('tab-' + t).hidden = t !== tab; });
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === tab); });
    window.scrollTo(0, 0);
    renderAll();
  }
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.tab); }); });
  document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });

  /* ---------- ホーム ---------- */
  function renderHome() {
    var lv = 'off';  // 公開サイト側と同じキー（JSONではなく文字列のまま保存されている）
    try { lv = localStorage.getItem(K.level) || 'off'; } catch (_) {}
    if (!(lv in LV)) lv = 'off';
    var n = $('nowLevel'); n.className = 'now ' + LV[lv][2];
    n.innerHTML = '<svg class="ico"><use href="#i-alert"/></svg><div>' + esc(LV[lv][0]) + '<small>' + esc(LV[lv][1]) + '</small></div>';
    document.querySelectorAll('#levelBtns button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.lv === lv); });
    var posts = load(K.posts, []);
    $('postCount').textContent = posts.length;
    $('postList').innerHTML = posts.length ? posts.map(function (p) {
      return '<li><div><b>' + esc(p.title) + '</b><span>' + esc(p.time) + '・' + esc(p.area) + (p.files.length ? '・添付' + p.files.length + '件' : '') + '</span></div><button data-del="' + p.id + '">取り下げ</button></li>';
    }).join('') : '<li class="empty">まだありません</li>';
  }
  $('levelBtns').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lv === 'manual' && !confirm('「供給停止」の表示に切り替えます。よろしいですか？')) return;
    try { localStorage.setItem(K.level, b.dataset.lv); } catch (_) {}
    addLog('表示を「' + LV[b.dataset.lv][0] + '」に切替');
    toast('公開ページの表示を切り替えました');
    renderHome();
  });
  $('postList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    var posts = load(K.posts, []), p = posts.filter(function (x) { return x.id === b.dataset.del; })[0];
    if (!p || !confirm('「' + p.title + '」を取り下げますか？')) return;
    save(K.posts, posts.filter(function (x) { return x !== p; }));
    addLog('お知らせを取り下げ：' + p.title);
    toast('取り下げました'); renderHome();
  });

  /* ---------- 投稿 ---------- */
  var files = [];  // {name, type, size, url(dataURL or ''), thumb}
  document.querySelectorAll('#tplChips button').forEach(function (b) {
    b.addEventListener('click', function () { var t = TPL[b.dataset.tpl]; $('pTitle').value = t[0]; $('pBody').value = t[1]; $('pTitle').classList.remove('is-invalid'); });
  });

  // 写真はブラウザ側で長辺1600pxに縮小して JPEG に描き直す（位置情報などの EXIF もここで消える）
  function shrinkImage(file) {
    return new Promise(function (resolve) {
      var img = new Image(), src = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(src);
        var url = c.toDataURL('image/jpeg', 0.8);
        resolve({ name: file.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg', size: Math.round(url.length * 0.75), orig: file.size, url: url });
      };
      img.onerror = function () { URL.revokeObjectURL(src); resolve(null); };
      img.src = src;
    });
  }
  function readPdf(file) {
    return new Promise(function (resolve) {
      // デモの保存領域は小さいので、1.5MBを超えるPDFは名前だけ残す（実運用では20MBまでサーバーへ）
      if (file.size > 1.5 * 1048576) return resolve({ name: file.name, type: file.type, size: file.size, url: '' });
      var r = new FileReader();
      r.onload = function () { resolve({ name: file.name, type: file.type, size: file.size, url: r.result }); };
      r.onerror = function () { resolve(null); };
      r.readAsDataURL(file);
    });
  }
  function addFiles(list) {
    Array.prototype.forEach.call(list, function (f) {
      var ok = /^(application\/pdf|image\/(jpeg|png|heic|heif|webp))$/.test(f.type) || /\.(pdf|jpe?g|png|heic)$/i.test(f.name);
      if (!ok) { toast('PDF・JPEG・PNG のみ添付できます'); return; }
      if (f.size > 20 * 1048576) { toast(f.name + ' は20MBを超えています'); return; }
      (f.type === 'application/pdf' || /\.pdf$/i.test(f.name) ? readPdf(f) : shrinkImage(f)).then(function (x) {
        if (!x) { toast(f.name + ' を読み込めませんでした'); return; }
        files.push(x); renderFiles();
      });
    });
  }
  function renderFiles() {
    $('fileList').innerHTML = files.map(function (f, i) {
      var isImg = f.type.indexOf('image') === 0;
      var icon = isImg ? '<img src="' + f.url + '" alt="">' : '<span class="fi">PDF</span>';
      var note = isImg && f.orig ? kb(f.orig) + ' → ' + kb(f.size) + '（縮小・位置情報なし）' : kb(f.size) + (f.url ? '' : '（デモでは名前のみ保存）');
      return '<li>' + icon + '<div class="fn"><b>' + esc(f.name) + '</b><span>' + note + '</span></div><button type="button" data-rm="' + i + '" aria-label="外す"><svg class="ico"><use href="#i-x"/></svg></button></li>';
    }).join('');
  }
  $('fCamera').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  $('fPick').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  $('fileList').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { files.splice(+b.dataset.rm, 1); renderFiles(); } });

  function draft() { return { id: 'p' + Date.now(), title: $('pTitle').value.trim(), body: $('pBody').value.trim(), area: $('pArea').value, time: now(), files: files.slice() }; }
  function previewHtml(p) {
    return '<div class="pv__meta">' + esc(p.time) + '　対象：' + esc(p.area) + '</div><h3>' + esc(p.title) + '</h3>' +
      (p.body ? '<p>' + esc(p.body) + '</p>' : '') +
      p.files.map(function (f) { return '<a href="#" onclick="return false"><svg class="ico"><use href="#i-file"/></svg>' + esc(f.name) + '（' + kb(f.size) + '）</a>'; }).join('');
  }
  $('postForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!$('pTitle').value.trim()) { $('pTitle').classList.add('is-invalid'); $('pTitle').focus(); toast('タイトルを入れてください'); return; }
    $('cfPreview').innerHTML = previewHtml(draft());
    $('confirm').hidden = false;
  });
  $('pTitle').addEventListener('input', function () { this.classList.remove('is-invalid'); });
  function closeSheet() { $('confirm').hidden = true; }
  $('cfClose').addEventListener('click', closeSheet);
  $('cfBack').addEventListener('click', closeSheet);
  $('confirm').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
  $('cfPublish').addEventListener('click', function () {
    var p = draft(), posts = load(K.posts, []);
    posts.unshift(p);
    if (!save(K.posts, posts)) {
      // 保存領域があふれたら添付の中身を外して名前だけ残す
      p.files = p.files.map(function (f) { return { name: f.name, type: f.type, size: f.size, url: '' }; });
      posts[0] = p;
      if (!save(K.posts, posts)) { toast('保存できませんでした。古いお知らせを取り下げてください'); return; }
    }
    addLog('お知らせを公開：' + p.title + (p.files.length ? '（添付' + p.files.length + '件）' : ''));
    closeSheet();
    $('postForm').reset(); files = []; renderFiles();
    toast('公開しました。公開ページに反映されます');
    go('home');
  });

  /* ---------- 供給状況 ---------- */
  var supply;
  function renderSupply() {
    supply = load(K.supply, null) || { rows: AREAS.map(function (a) { return { area: a, st: '通常供給', eta: '' }; }), updated: '' };
    $('supplyRows').innerHTML = supply.rows.map(function (r, i) {
      return '<div class="srow"><div class="srow__name">' + esc(r.area) + '</div><div class="seg">' +
        STATES.map(function (s) { return '<button type="button" data-i="' + i + '" data-st="' + s + '" class="' + (r.st === s ? 'is-on' : '') + '">' + s.slice(0, 2) + '<br>' + s.slice(2) + '</button>'; }).join('') +
        '</div><input type="text" data-eta="' + i + '" value="' + esc(r.eta) + '" placeholder="復旧見込み（例：11月14日 夕方）"></div>';
    }).join('');
  }
  $('supplyRows').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-st]'); if (!b) return;
    supply.rows[+b.dataset.i].st = b.dataset.st;
    b.parentNode.querySelectorAll('button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
  });
  $('supplyRows').addEventListener('input', function (e) { if (e.target.dataset.eta != null) supply.rows[+e.target.dataset.eta].eta = e.target.value; });
  $('supplySave').addEventListener('click', function () {
    supply.updated = now(); save(K.supply, supply);
    addLog('供給状況を更新：' + supply.rows.map(function (r) { return r.area + '＝' + r.st; }).join('、'));
    toast('供給状況を公開しました');
  });

  /* ---------- 履歴 ---------- */
  function renderLog() {
    var l = load(K.log, []);
    $('logList').innerHTML = l.length ? l.map(function (x) { return '<li><time>' + esc(x.t) + '　担当者A</time>' + esc(x.m) + '</li>'; }).join('') : '<li class="empty">まだありません</li>';
  }
  $('resetDemo').addEventListener('click', function () {
    if (!confirm('デモで入力した内容（お知らせ・供給状況・履歴・表示の段階）をすべて消します。')) return;
    [K.posts, K.supply, K.log, K.login, K.level].forEach(function (k) { try { localStorage.removeItem(k); } catch (_) {} });
    location.reload();
  });

  function renderAll() { renderHome(); renderSupply(); renderLog(); }
})();
