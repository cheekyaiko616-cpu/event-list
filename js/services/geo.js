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

/** 緯度・経度として使える値か。 */
const validGeo = (g) => !!g && Number.isFinite(g.lat) && Number.isFinite(g.lon) && Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180;

/** 会場の名前がなく、県・市・国だけの場所か（例：愛知県名古屋市、東京、静岡、アメリカ）。ここは天気の目安にはなるが、ナビの行き先にはしない。 */
function isVague(place) {
  const q = place.replace(/[（(].*?[）)]/g, ' ').replace(/\s+/g, '');
  return /^(?:[一-龥ァ-ヶ]{1,5}(?:都|道|府|県|市|区|町|村))+$/.test(q) || /^(?:東京|大阪|京都|愛知|静岡|岐阜|三重|北海道|アメリカ|韓国|台湾|日本|中国)$/.test(q);
}

/**
 * 場所を引く。geo は、公式情報で確かめた緯度・経度（feed.json に書かれたもの）。あればそれを最優先にする。
 * 見つからなければ null、通信できなければ例外。会場の名前がない場所は approx:true（ナビの行き先にはしない）。
 */
export async function locate(place, geo) {
  if (!hasPlace(place)) return null;
  const known = knownVenue(place);
  if (validGeo(geo)) return { lat: geo.lat, lon: geo.lon, name: known ? known.name : place, station: known ? known.station : '', stationKm: known ? known.stationKm : null };
  if (known) return known;
  const hit = cacheGet('geo', place, TRIP.geoTtl);
  if (hit !== undefined) return hit;
  if (!inflight.has(place)) inflight.set(place, search(place).finally(() => inflight.delete(place)));
  return inflight.get(place);
}

/** 場所の欄から、地図で探す言葉を優先順に作る。括弧の中の住所を先に使い、「＆」などで複数ある場合は最初の1つだけ見る。 */
function queriesFor(place) {
  const list = [];
  const addr = (place.match(/[（(]([^）)]*[市区町村][^）)]*\d[^）)]*)[）)]/) || [])[1];
  if (addr) {
    const a = addr.split(/[＆&、,・]/)[0].trim();
    list.push(a);
    const coarse = a.replace(/(\d+)[-ー−－].*$/, '$1'); // 番地を落として町まで
    if (coarse !== a) list.push(coarse);
    const wide = (a.match(/^(.*?[市区町村](?:.*?[区])?)/) || [])[1];
    if (wide && !list.includes(wide)) list.push(wide);
  }
  const name = place.replace(/[（(].*?[）)]/g, ' ').split(/[＆&]/)[0].trim();
  if (name && !list.includes(name)) list.push(name);
  return list;
}

async function search(place) {
  const pref = (place.match(/[一-龥]{2,3}[都道府県]/) || [])[0]; // 場所に書かれた県。検索結果がその県の外なら使わない（同名の別の場所を避ける）
  let found = null;
  for (const q of queriesFor(place)) {
    const gap = 1100 - (Date.now() - last);
    if (gap > 0) await wait(gap);
    last = Date.now();
    const res = await fetch(`${TRIP.geoApi}?format=jsonv2&limit=3&accept-language=ja&q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('geo');
    const list = await res.json();
    const top = (Array.isArray(list) ? list : []).find((x) => Number.isFinite(+x.lat) && Number.isFinite(+x.lon) && (!pref || String(x.display_name || '').includes(pref)));
    if (top) { found = { lat: +top.lat, lon: +top.lon, name: place, station: '', stationKm: null }; break; }
  }
  if (found && isVague(place)) found.approx = true;
  cacheSet('geo', place, found, 200);
  return found;
}
