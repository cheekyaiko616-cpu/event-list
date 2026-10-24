// カレンダー追加用の小さなページ（cal.html）。URLの#以降に入っている .ics を、標準カレンダーで開く。
// アプリ本体とは独立していて、ここだけで動く。
(function () {
  var msg = document.getElementById('msg');
  var btn = document.getElementById('go');
  var url = null;
  try {
    var b64 = decodeURIComponent(location.hash.replace(/^#d=/, '')).replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    url = URL.createObjectURL(new Blob([bytes], { type: 'text/calendar;charset=utf-8' }));
  } catch (e) { /* 下で案内 */ }
  if (!url) {
    msg.textContent = '予定のデータを読み取れませんでした。アプリに戻って、もう一度お試しください。';
    msg.className = 'err';
    btn.hidden = true;
    return;
  }
  btn.addEventListener('click', function () { location.href = url; });
  // 開いたらすぐ、標準カレンダーの追加画面へ進む。進めなかったときのために、ボタンは残す。
  btn.hidden = true;
  msg.textContent = 'カレンダーの追加画面を開いています…';
  location.href = url;
  setTimeout(function () {
    msg.textContent = '追加画面が出ないときは、下のボタンを押してください。';
    btn.hidden = false;
  }, 2500);
})();
