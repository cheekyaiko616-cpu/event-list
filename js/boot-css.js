// 見た目のファイル（dist/app.min.css）と、同梱の書体の読み込みで、最初の1コマを待たせない。
// index.html では、このCSSを「印刷用」（media="print"）として置き、先に起動画面だけを出す。
// ここでCSSと書体が読み終わるのを待ってから、通常のCSSに切り替え、アプリ本体（dist/app.min.js）を動かす。
// （本体は画面の大きさを測る処理があり、書体が途中で切り替わると文字の幅が動くため、揃う前には動かさない）
// 何があっても、約4秒でアプリ本体を動かす（読み込みが失敗したとき用）。
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
