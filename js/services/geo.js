// 場所の欄の文字 → 緯度・経度。会場表(venues.js)を先に見て、なければ地図の検索で探す。
// 検索は1秒に1回までのお願いがあるので、間をあけて呼ぶ。結果は保存して、同じ場所は二度調べない。
import { TRIP } from '../config.js';
import { VENUES } from './venues.js';
import { cacheGet, cacheSet } from './trip-cache.js';

/** 現地がある予定の場所か（オンライン・未定などは対象外）。 */
export const hasPlace = (place) => !!place && !TRIP.offline.test(place);

let last = 0;
const inflight = new Map(); // 検索中の場所（同じ場所を同時に何度も調べない）
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 会場表だけで引く（通信しない）。なければ null。 */
function knownVenue(place) {
  const v = VENUES.find((x) => place.includes(x.match));
  return v ? { lat: v.lat, lon: v.lon, name: v.name, station: v.station || '', stationKm: v.stationKm ?? null } : null;
}

/** 場所を引く。見つからなければ null、通信できなければ例外。 */
export async function locate(place) {
  if (!hasPlace(place)) return null;
  const known = knownVenue(place);
  if (known) return known;
  const hit = cacheGet('geo', place, TRIP.geoTtl);
  if (hit !== undefined) return hit;
  if (!inflight.has(place)) inflight.set(place, search(place).finally(() => inflight.delete(place)));
  return inflight.get(place);
}

async function search(place) {
  const gap = 1100 - (Date.now() - last);
  if (gap > 0) await wait(gap);
  last = Date.now();
  const q = place.replace(/[（(].*?[）)]/g, ' ').trim();
  const res = await fetch(`${TRIP.geoApi}?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('geo');
  const list = await res.json();
  const top = Array.isArray(list) && list[0];
  const found = top && Number.isFinite(+top.lat) && Number.isFinite(+top.lon) ? { lat: +top.lat, lon: +top.lon, name: place, station: '', stationKm: null } : null;
  cacheSet('geo', place, found, 200);
  return found;
}
