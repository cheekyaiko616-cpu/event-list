// 乗り換え・ナビ・マップのリンクを作る（通信はしない。タップで外のアプリ／ページが開く）。
import { TRIP } from '../config.js';
import { parseDate, weekday } from '../util/date.js';

const p2 = (n) => String(n).padStart(2, '0');

/** 時刻の使い方 → Yahoo!乗換案内の type（1=出発 4=到着 3=始発 2=終電）。 */
export const TIME_MODES = [
  { id: 'arrive', label: 'この時刻に着きたい', type: '4', text: '到着' },
  { id: 'depart', label: 'この時刻に出たい', type: '1', text: '出発' },
  { id: 'first', label: '始発', type: '3', text: '始発' },
  { id: 'last', label: '終電', type: '2', text: '終電' }
];
export const timeMode = (id) => TIME_MODES.find((m) => m.id === id) || TIME_MODES[0];

/**
 * Yahoo!乗換案内の検索ページ。Yahoo自身が検索したときと同じ形（時は2けた、分は十の位と一の位に分ける）にする。
 * date は 2026-11-03、time は 09:05、mode は TIME_MODES の id。
 */
export function transitUrl({ from, to, date, time, mode }) {
  const [y, m, d] = date.split('-');
  const [hh, mm] = time.split(':');
  const q = new URLSearchParams({
    from, flatlon: '', to, tlatlon: '', via: '',
    y, m: p2(+m), d: p2(+d), hh: p2(+hh), m1: mm[0], m2: mm[1], type: timeMode(mode).type,
    ticket: 'ic', expkind: '1', userpass: '1', ws: '3', s: '0', al: '1', shin: '1', ex: '1', hb: '1', lb: '1', sr: '1'
  });
  return `${TRIP.transit}?${q}`;
}

/** 「11/3(月) 9:00 到着」のような、検索条件の短い表示。始発・終電は時刻なし。 */
export function whenText({ date, time, mode }) {
  const p = parseDate(date);
  const md = `${p.m}/${p.d}(${weekday(p)})`;
  const t = timeMode(mode);
  if (t.id === 'first' || t.id === 'last') return `${md} ${t.text}`;
  const [hh, mm] = time.split(':');
  return `${md} ${+hh}:${mm} ${t.text}`;
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
