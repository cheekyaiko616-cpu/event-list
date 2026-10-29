// 予定の詳細に出す「現地の天気」と「乗り換え・ナビ・マップ」のボタン。場所がある予定だけに出る。
// 通信は services/ に任せ、ここは見せ方だけを決める。乗り換えの入力は transit-sheet.js。
import { TRIP } from '../config.js';
import { el } from '../util/dom.js';
import { parseDate, weekday, eventEnd, todayIso, addDaysIso, daysUntil } from '../util/date.js';
import { hasPlace, locate } from '../services/geo.js';
import { inJapan } from '../services/trip-links.js';
import { openWeatherSheet } from './weather-sheet.js';
import { forecast, weatherLabel } from '../services/weather.js';
import { carnaviUrl, mapUrl } from '../services/trip-links.js';
import { openTransit } from './transit-sheet.js';

const md = (iso) => { const p = parseDate(iso); return `${p.m}/${p.d}(${weekday(p)})`; };
const where = (e) => locate(e.place).catch(() => null); // 同じ場所は保存・共有されるので、何度呼んでも通信は1回

/** 現地の天気（日本国内の予定だけ）。日付がない・終わった・場所がない予定では null。海外・場所が分からない予定では、場所を調べたあと何も出さない。 */
export function weatherEl(e) {
  if (!hasPlace(e.place) || !parseDate(e.date) || eventEnd(e) < todayIso()) return null;
  const box = el('div', { class: 'wx', hidden: true }); // 日本国内と分かるまで出さない
  const text = (t) => { box.hidden = false; box.replaceChildren(el('p', { class: 'wx-text', text: t })); };
  let place = null;
  locate(e.place)
    .then((pos) => {
      if (!inJapan(pos)) return null; // 海外・場所が分からない：天気は出さない
      place = pos;
      if (daysUntil(e.date) >= TRIP.forecastDays) {
        text(`${md(addDaysIso(e.date, -(TRIP.forecastDays - 1)))}ごろから、現地の天気が出ます`);
        return null;
      }
      text('現地の天気を読み込み中…');
      return forecast(pos);
    })
    .then((days) => {
      if (!days) return;
      const list = [];
      for (let d = e.date; d <= eventEnd(e) && list.length < 3; d = addDaysIso(d, 1)) if (days[d]) list.push(d);
      if (!list.length) { text('この日の天気は、まだ出ていません'); return; }
      box.hidden = false;
      box.replaceChildren(el('div', { class: 'wx-strip' }, list.map((d) => {
        const w = days[d];
        const { icon, label } = weatherLabel(w.code);
        return el('button', { class: 'wx-day', type: 'button', 'aria-label': `${md(d)} ${label}、最高${w.max}度、最低${w.min}度、降水確率${w.pop}%。タップで1時間ごとの天気`,
          onclick: (ev) => { ev.stopPropagation(); openWeatherSheet(place, d, md(d), e.place); } },
          el('small', { text: md(d) }),
          el('span', { class: 'i', 'aria-hidden': 'true', text: icon }),
          el('span', { class: 't', text: `${w.max}°/${w.min}°` }),
          el('small', { text: `降水 ${w.pop}%` }));
      })));
    })
    .catch(() => text('天気を取得できませんでした（通信を確認してください）'));
  return box;
}

/** 乗り換え・ナビ・マップのボタン。場所がない（またはオンラインなど）の予定では null。 */
export function tripButtons(e) {
  if (!hasPlace(e.place)) return null;
  const map = el('a', { class: 'btn', href: mapUrl(null, e.place), target: '_blank', rel: 'noopener', text: 'マップ' });
  const navi = el('a', { class: 'btn', href: '#', 'aria-disabled': 'true', text: 'ナビ' });
  where(e).then((pos) => {
    if (!pos) return;
    map.href = mapUrl(pos, e.place);
    navi.href = carnaviUrl(pos, pos.name || e.place);
    navi.removeAttribute('aria-disabled');
  });
  navi.addEventListener('click', (ev) => { if (navi.getAttribute('aria-disabled')) ev.preventDefault(); });
  return el('div', { class: 'actions trip-actions' },
    el('button', { class: 'btn', type: 'button', text: '乗り換え', onclick: () => openTransit(e, () => where(e)) }), navi, map);
}
