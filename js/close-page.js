// close.html 用。アプリから開いた画面なので、自分で閉じる命令を出す。閉じられなければ案内を出したままにする。
(function () {
  try { window.close(); } catch (e) { /* 案内を表示したままにする */ }
  setTimeout(function () { try { window.close(); } catch (e) { /* 何もしない */ } }, 300);
})();
