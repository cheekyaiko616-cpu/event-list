// 見た目のファイル（dist/app.min.css）の読み込みで、最初の1コマを待たせない。
// index.html では、このCSSを「印刷用」（media="print"）として置き、先に起動画面だけを出す。
// ここでCSSが読み終わるのを待ってから、通常のCSSに切り替え、アプリ本体（dist/app.min.js）を動かす。
// （本体は画面の大きさを測る処理があるため、見た目が揃う前には動かさない）
// 何があっても、約4秒でアプリ本体を動かす（CSSの読み込みが失敗したとき用）。
(function () {
  var link = document.getElementById('app-css');
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (link) link.media = 'all';
    var s = document.createElement('script');
    s.src = 'dist/app.min.js';
    document.body.appendChild(s);
  }
  if (!link || link.sheet) { start(); return; }
  link.addEventListener('load', start);
  link.addEventListener('error', start);
  setTimeout(start, 4000);
})();
