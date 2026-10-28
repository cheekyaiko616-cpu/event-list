// 予定の詳細に出す「現地の天気・乗り換え・ナビ・マップ」。場所がある予定だけに出る。
// 通信は services/ に任せ、ここは見せ方だけを決める。
import { TRIP } from '../config.js';
import { el } from '../util/dom.js';
import { parseDate, weekday, eventEnd, todayIso, addDaysIso, daysUntil } from '../util/date.js';
import { hasPlace, locate } from '../services/geo.js';
import { forecast, weatherLabel } from '../services/weather.js';
import { nearStations } from '../services/stations.js';
import { transitUrl, whenText, carnaviUrl, mapUrl, inJapan, whereAmI } from '../services/trip-links.js';
import { getOrigin, setOrigin } from '../services/trip-cache.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const memo = new Map(); // 予定ごとの、乗り換えの入力（画面が描き直されても消えないように）
const opened = new Set(); // 乗り換えの入力欄を開いている予定

const md = (iso) => { const p = parseDate(iso); return `${p.m}/${p.d}(${weekday(p)})`; };

/* ---------- 天気 ---------- */
function weatherBox(e) {
  const box = el('div', { class: 'wx' });
  const text = (t) => { box.replaceChildren(el('p', { class: 'wx-text', text: t })); };
  if (!parseDate(e.date) || eventEnd(e) < todayIso()) return null;
  const left = daysUntil(e.date);
  if (left >= TRIP.forecastDays) {
    text(`${md(addDaysIso(e.date, -(TRIP.forecastDays - 1)))}ごろから、現地の天気が出ます`);
    return box;
  }
  text('現地の天気を読み込み中…');
  box.setAttribute('role', 'status');
  locate(e.place)
    .then((pos) => (pos ? forecast(pos) : null))
    .then((days) => {
      if (!days) { text('場所が分からないため、天気は出せません'); return; }
      const list = [];
      for (let d = e.date; d <= eventEnd(e) && list.length < 5; d = addDaysIso(d, 1)) if (days[d]) list.push(d);
      if (!list.length) { text('この日の天気は、まだ出ていません'); return; }
      box.removeAttribute('role');
      box.replaceChildren(el('div', { class: 'wx-strip' }, list.map((d) => {
        const w = days[d];
        const { icon, label } = weatherLabel(w.code);
        return el('div', { class: 'wx-day', title: `${label}、最高${w.max}度、最低${w.min}度、降水確率${w.pop}%` },
          el('small', { text: md(d) }),
          el('span', { class: 'i', 'aria-label': label, role: 'img', text: icon }),
          el('span', { class: 't', text: `${w.max}°/${w.min}°` }),
          el('small', { text: `☂${w.pop}%` }));
      })));
    })
    .catch(() => text('天気を取得できませんでした（通信を確認してください）'));
  return box;
}

/* ---------- 乗り換え ---------- */
function transitForm(e, getPos) {
  const m = memo.get(e.id) || {};
  const today = todayIso();
  const date = ISO.test(m.date || '') && m.date >= today ? m.date : (e.date && e.date >= today ? e.date : today);
  const from = el('input', { class: 'input', type: 'text', name: 'from', autocomplete: 'off', placeholder: '例）新宿', value: m.from ?? getOrigin() });
  const to = el('input', { class: 'input', type: 'text', name: 'to', autocomplete: 'off', placeholder: '到着駅', value: m.to ?? '' });
  const day = el('input', { class: 'input', type: 'date', name: 'date', value: date });
  const time = el('input', { class: 'input', type: 'time', name: 'time', value: m.time || TRIP.defaultTime });
  const how = el('select', { class: 'input', name: 'how' },
    el('option', { value: 'arrive', text: '到着' }), el('option', { value: 'depart', text: '出発' }));
  how.value = m.arrive === false ? 'depart' : 'arrive';
  const err = el('p', { class: 'err', role: 'alert' });
  const near = el('div', { class: 'chips' });
  const go = el('a', { class: 'btn solid wide', target: '_blank', rel: 'noopener', href: '#' }, el('span', { text: 'Yahoo!乗換案内で検索' }), el('small', { text: '' }));

  const read = () => ({ from: from.value.trim(), to: to.value.trim(), date: day.value, time: time.value, arrive: how.value === 'arrive' });
  const problem = (v) => (!v.from ? ['出発駅を入力してください', from] : !v.to ? ['到着駅を入力してください', to] : !ISO.test(v.date) ? ['日付を入力してください', day] : !/^\d{2}:\d{2}$/.test(v.time) ? ['時刻を入力してください', time] : null);
  const refresh = () => {
    const v = read();
    memo.set(e.id, v);
    go.href = problem(v) ? '#' : transitUrl(v);
    go.lastChild.textContent = ISO.test(v.date) && /^\d{2}:\d{2}$/.test(v.time) ? whenText(v) : '';
    return v;
  };
  const chip = (name, km, target) => el('button', { type: 'button', class: 'pick', text: name, onclick: () => { target.value = name; err.textContent = ''; refresh(); } },
    el('small', { text: km < 1 ? ` ${Math.round(km * 1000)}m` : ` ${km.toFixed(1)}km` }));

  // 到着駅：会場表にあればそれ、なければいちばん近い駅の候補を出す
  const fillTo = async () => {
    const pos = await getPos();
    if (!pos) return;
    if (pos.station && !to.value) { to.value = pos.station; refresh(); }
    if (pos.station) { near.replaceChildren(chip(pos.station, pos.stationKm ?? 0, to)); return; }
    const list = await nearStations(pos, 3).catch(() => []);
    if (!list.length) return;
    if (!to.value) { to.value = list[0].name; refresh(); }
    near.replaceChildren(...list.map((s) => chip(s.name, s.km, to)));
  };
  fillTo().catch(() => {});

  const here = el('button', { type: 'button', class: 'btn', text: '現在地の駅', onclick: async (ev) => {
    const b = ev.currentTarget;
    b.disabled = true; err.textContent = '';
    try {
      const pos = await whereAmI();
      if (!inJapan(pos)) throw new Error('現在地が日本国外のため使えません。駅名を入力してください');
      const list = await nearStations(pos, 3);
      if (!list.length) throw new Error('近くの駅が見つかりませんでした。駅名を入力してください');
      from.value = list[0].name; refresh();
    } catch (x) { err.textContent = x.message || '現在地を取得できませんでした'; }
    finally { b.disabled = false; }
  } });

  const form = el('form', { class: 'tform', novalidate: true },
    el('div', { class: 'input-row' }, el('label', {}, el('span', { text: '出発駅' }), from), here),
    el('div', { class: 'input-row' }, el('label', {}, el('span', { text: '到着駅' }), to)),
    near,
    el('div', { class: 'input-row' }, el('label', {}, el('span', { text: '日付' }), day), el('label', {}, el('span', { text: '時刻' }), time), el('label', {}, el('span', { text: 'の' }), how)),
    err, go);
  form.addEventListener('input', () => { err.textContent = ''; refresh(); });
  form.addEventListener('change', () => { err.textContent = ''; refresh(); });
  form.addEventListener('submit', (ev) => { ev.preventDefault(); go.click(); });
  go.addEventListener('click', (ev) => {
    const v = refresh();
    const bad = problem(v);
    err.textContent = bad ? bad[0] : '';
    if (bad) { ev.preventDefault(); bad[1].focus(); return; }
    go.href = transitUrl(v);
    setOrigin(v.from);
  });
  refresh();
  return form;
}

/** 詳細に入れる部品。場所がない（またはオンラインなど）の予定では null。 */
export function tripEl(e) {
  if (!hasPlace(e.place)) return null;
  let posP = null;
  const getPos = () => (posP ||= locate(e.place).catch(() => null)); // 場所は一度だけ調べる

  const map = el('a', { class: 'btn', href: mapUrl(null, e.place), target: '_blank', rel: 'noopener', text: 'マップ' });
  const navi = el('a', { class: 'btn', href: '#', 'aria-disabled': 'true', text: 'ナビ' });
  getPos().then((pos) => {
    if (!pos) return;
    map.href = mapUrl(pos, e.place);
    navi.href = carnaviUrl(pos, pos.name || e.place);
    navi.removeAttribute('aria-disabled');
  });
  navi.addEventListener('click', (ev) => { if (navi.getAttribute('aria-disabled')) ev.preventDefault(); });

  const form = el('div', { class: 'tform-wrap', hidden: true });
  const toggle = el('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', text: '乗り換え', onclick: () => {
    const on = form.hidden;
    if (on) opened.add(e.id); else opened.delete(e.id);
    if (on && !form.firstChild) form.append(transitForm(e, getPos));
    form.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
  } });
  if (opened.has(e.id)) toggle.click();

  return el('div', { class: 'trip' }, weatherBox(e), el('div', { class: 'actions' }, toggle, navi, map), form);
}
