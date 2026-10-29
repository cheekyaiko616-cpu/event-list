// 見た目のファイル（dist/app.min.css）と、同梱の書体の読み込みで、最初の1コマを待たせない。
// index.html では、このCSSを「印刷用」（media="print"）として置き、先に起動画面だけを出す。
// ここでCSSと書体が読み終わるのを待ってから、通常のCSSに切り替え、アプリ本体（dist/app.min.js）を動かす。
// （本体は画面の大きさを測る処理があり、書体が途中で切り替わると文字の幅が動くため、揃う前には動かさない）
// 何があっても、約4秒でアプリ本体を動かす（読み込みが失敗したとき用）。
// 起動に失敗したとき（本体が読めない・起動の途中で例外）：1回だけ自動で再起動する。
// それでも失敗するときは、「キャッシュを消して再起動」を出す。起動が済んだ後のエラーでは何もしない。
// 本体は起動が済むと <html data-ready="1"> を付ける（js/main.js）。
(function () {
  var KEY = 'eventcho.recover';
  function booted() { return document.documentElement.getAttribute('data-ready') === '1'; }
  function get() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { if (v === null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, v); } catch (e) { /* 使えなくても続ける */ } }
  var handled = false;
  function recover() {
    if (handled || booted()) return;
    handled = true;
    if (get() !== '1') { set('1'); location.reload(); return; } // 1回目：自動で再起動
    showReset(); // 2回目：自動では繰り返さない
  }
  function showReset() {
    var splash = document.getElementById('splash');
    if (splash) splash.style.display = 'none';
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,sans-serif';
    var msg = document.createElement('p');
    msg.textContent = '起動に失敗しました。';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'キャッシュを消して再起動';
    btn.style.cssText = 'min-height:44px;padding:0 20px;border:0;border-radius:10px;background:var(--ink);color:var(--on-ink);font:inherit;font-weight:500';
    btn.onclick = function () {
      btn.disabled = true;
      set(null);
      var jobs = [];
      try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) { /* 続ける */ }
      try { if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) { /* 続ける */ }
      Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
    };
    box.appendChild(msg);
    box.appendChild(btn);
    document.body.appendChild(box);
  }
  window.addEventListener('error', recover);
  window.addEventListener('unhandledrejection', recover);
  // 起動できたら、次の失敗のために数を戻す
  var t = setInterval(function () { if (booted()) { clearInterval(t); set(null); } }, 500);
  setTimeout(function () { clearInterval(t); }, 20000);

  var link = document.getElementById('app-css');
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (link) link.media = 'all';
    var s = document.createElement('script');
    s.src = 'dist/app.min.js';
    s.onerror = recover; // 本体の読み込みに失敗
    document.body.appendChild(s);
  }
  // 書体：使う4つを先に読み込んでおく（読み込みに失敗しても、代わりの書体で動く）
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('500 30px "Barlow Condensed"'),
      document.fonts.load('600 16px "Barlow Condensed"'),
      document.fonts.load('700 28px "Barlow Condensed"'),
      document.fonts.load('italic 600 28px "Cormorant Garamond"')
    ]).catch(function () {});
  }
  // CSSを通常に切り替えてから書体を読み込む（切り替える前は、書体の指定が効かず、読み込みが始まらない）
  function ready() { if (link) link.media = 'all'; fonts().then(start, start); }
  setTimeout(start, 4000);
  if (!link || link.sheet) { ready(); return; }
  link.addEventListener('load', ready);
  link.addEventListener('error', start);
})();
