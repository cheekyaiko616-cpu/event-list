// 起動画面で回る乗りもののイラスト（背景を透明にした画像）。どれも右向き。
//   w, h   … 表示する大きさ(px)。画像は3倍の大きさで用意してあり、くっきり見える
//   ground … true なら下端を回転の線に乗せる（横から見た車・列車）。false なら中心を線に合わせる（上から見た飛行機）
const img = (src, w, h) => `<img src="${src}" width="${w}" height="${h}" alt="" draggable="false">`;

export const VEHICLES = [
  { name: '飛行機', svg: img('img/splash-plane.png', 55, 76), w: 55, h: 76, ground: false },
  { name: 'スポーツカー', svg: img('img/splash-car.png', 80, 40), w: 80, h: 40, ground: true },
  { name: '新幹線', svg: img('img/splash-train.png', 104, 27), w: 104, h: 27, ground: true }
];
