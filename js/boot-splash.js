// 起動画面の乗りものを、最初の1コマから出す。
// 乗りもの（飛行機・スポーツカー・新幹線）の絵を選んで、index.html の起動画面（#splash）に足す。
// アプリ本体（dist/app.min.js）が動き出すのを待たないよう、独立した小さなファイルにしてある。
// 種類は前回と同じものが続かないように選ぶ。どれも右向き。
//   w, h   … 表示する大きさ(px)。画像は3倍の大きさで用意してあり、くっきり見える
//   ground … true なら下端を回転の線に乗せる（横から見た車・列車）。false なら中心を線に合わせる（上から見た飛行機）
// 失敗しても、乗りものが出ないだけで動作に影響しない。
(function () {
  var V = [
    { src: 'img/splash-plane.png', w: 55, h: 76, ground: false },
    { src: 'img/splash-car.png', w: 80, h: 40, ground: true },
    { src: 'img/splash-train.png', w: 104, h: 27, ground: true }
  ];
  var KEY = 'event-cho-splash';
  var arm = document.querySelector('#splash .sp-arm');
  if (!arm) return;
  var last = -1;
  try { last = Number(localStorage.getItem(KEY)); } catch (e) { /* なくても動く */ }
  var i = Math.floor(Math.random() * V.length);
  if (i === last) i = (i + 1) % V.length;
  try { localStorage.setItem(KEY, String(i)); } catch (e) { /* なくても動く */ }
  var v = V[i];
  arm.innerHTML = '<div class="sp-veh" style="width:' + v.w + 'px;height:' + v.h + 'px;transform:translate(-50%,' + (v.ground ? '-100%' : '-50%') + ')">' +
    '<img src="' + v.src + '" width="' + v.w + '" height="' + v.h + '" alt="" draggable="false"></div>';
})();
