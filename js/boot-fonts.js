// 文字のフォントを、画面を止めずに後から読む。
// <link> で直接読むと、読み終わるまで画面が真っ白（暗い設定では真っ黒）のままになるため、ここで足す。
// 読み込みに失敗しても、代わりの文字で表示されるので動作に影響しない。
(function () {
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap';
  document.head.appendChild(l);
})();
