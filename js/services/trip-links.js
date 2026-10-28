// 乗り換え・ナビ・マップのリンクを作る（通信はしない。タップで外のアプリ／ページが開く）。
import { TRIP } from '../config.js';
import { parseDate, weekday } from '../util/date.js';

const p2 = (n) => String(n).padStart(2, '0');

/** Yahoo!乗換案内の検索ページ。date は 2026-11-03、time は 09:00、arrive が true なら「到着」基準。 */
export function transitUrl({ from, to, date, time, arrive }) {
  const [y, m, d] = date.split('-');
  const [hh, mm] = time.split(':');
  const q = new URLSearchParams({
    from, to, y, m: p2(+m), d: p2(+d), ym: `${y}${p2(+m)}`, datepick: `${y}${p2(+m)}${p2(+d)}`,
    hh: String(+hh), m1: mm[0], m2: mm[1], type: arrive ? '4' : '1',
    ticket: 'ic', expkind: '1', ws: '3', s: '0', al: '1', shin: '1', ex: '1', hb: '1', lb: '1', sr: '1'
  });
  return `${TRIP.transit}?${q}`;
}

/** 「11/3(月) 9:00 到着」のような、検索条件の短い表示。 */
export function whenText({ date, time, arrive }) {
  const p = parseDate(date);
  const [hh, mm] = time.split(':');
  return `${p.m}/${p.d}(${weekday(p)}) ${+hh}:${mm} ${arrive ? '到着' : '出発'}`;
}

/** Yahoo!カーナビ（入っている端末だけで開く）。現在地から会場までの道順。 */
export function carnaviUrl(pos, label) {
  const name = String(label || '目的地').replace(/,/g, ' ');
  return `${TRIP.carnaviScheme}?point=current&point=${pos.lat.toFixed(7)},${pos.lon.toFixed(7)},${encodeURIComponent(name)}`;
}

/** マップ（iPhoneの標準マップ）。場所が分かれば印を付けて開く。 */
export function mapUrl(pos, place) {
  const q = encodeURIComponent(place || '会場');
  return pos ? `https://maps.apple.com/?ll=${pos.lat},${pos.lon}&q=${q}` : `https://maps.apple.com/?q=${q}`;
}

/** 日本国内か（乗り換え案内は国内だけ使える）。 */
const JAPAN = [[23.8, 28.6, 122.8, 131.4], [28.6, 34, 128, 132.1], [34.05, 34.75, 129.1, 129.55], [32.6, 36.5, 130.6, 136], [32.3, 41.6, 136, 142.2], [41.3, 45.6, 139.3, 145.9], [24, 27.8, 140.8, 142.5]];
export const inJapan = (pos) => !!pos && JAPAN.some(([a, b, c, d]) => pos.lat >= a && pos.lat <= b && pos.lon >= c && pos.lon <= d);

/** 現在地（許可が必要）。 */
export function whereAmI() {
  return new Promise((ok, ng) => {
    if (!('geolocation' in navigator)) { ng(new Error('この端末では現在地を使えません')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => ng(new Error(e.code === 1 ? '位置情報が許可されていません。設定で許可するか、駅名を入力してください' : '現在地を取得できませんでした。駅名を入力してください')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
  });
}
