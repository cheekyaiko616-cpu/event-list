// 「乗り換え」の入力画面（下から出る）。出発駅・到着駅・日時を入れると、Yahoo!乗換案内の検索結果が開く。
// 入力は予定ごとに覚えておき、前回の出発駅も次回の初期値にする。
import { TRIP } from '../config.js';
import { $, el, clear } from '../util/dom.js';
import { todayIso } from '../util/date.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { nearStations } from '../services/stations.js';
import { transitUrl, viaBrowser, whenText, inJapan, whereAmI, TIME_MODES, timeMode } from '../services/trip-links.js';
import { getOrigin, setOrigin } from '../services/trip-cache.js';

const MARKUP = `
  <div class="sheet" id="tr-sheet" role="dialog" aria-modal="true" aria-labelledby="tr-heading">
    <div class="sheet-head">
      <h2 id="tr-heading">乗り換え案内</h2>
      <button type="button" class="ghost" id="tr-close">閉じる</button>
    </div>
    <div id="tr-body"></div>
  </div>`;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const memo = new Map(); // 予定ごとの入力（開き直しても残る）
let wrap = null;

export function initTransitSheet() {
  wrap = mountSheet(MARKUP);
  $('#tr-close').addEventListener('click', () => hideSheet(wrap));
}

const field = (label, input) => el('div', { class: 'field flush' }, el('label', { text: label }), input);
const fixedTime = (v) => v.mode === 'first' || v.mode === 'last'; // 始発・終電は時刻を使わない
const problem = (v, ui) => (!v.from ? ['出発駅を入力してください', ui.from] : !v.to ? ['到着駅を入力してください', ui.to] : !ISO.test(v.date) ? ['日付を入力してください', ui.day] : !TIME.test(v.time) && !fixedTime(v) ? ['時刻を入力してください', ui.time] : null);

/** e: 予定。getPos: 会場の位置を返す関数（会場表／検索の結果。分からなければ null）。 */
export function openTransit(e, getPos) {
  const m = memo.get(e.id) || {};
  const today = todayIso();
  const inp = (name, type, value, extra) => el('input', { class: 'input', name, type, value, autocomplete: 'off', ...extra });
  const ui = {
    from: inp('from', 'text', m.from ?? getOrigin(), { placeholder: '例）新宿', enterkeyhint: 'next' }),
    to: inp('to', 'text', m.to ?? '', { placeholder: '到着駅', enterkeyhint: 'done' }),
    day: inp('date', 'date', ISO.test(m.date || '') && m.date >= today ? m.date : (e.date && e.date >= today ? e.date : today)),
    time: inp('time', 'time', m.time || TRIP.defaultTime),
    how: el('select', { class: 'input', name: 'how' }, TIME_MODES.map((t) => el('option', { value: t.id, text: t.label })))
  };
  ui.how.value = timeMode(m.mode).id;
  const err = el('p', { class: 'err', role: 'alert' });
  const near = el('div', { class: 'chips' });
  const when = el('small', { text: '' });
  const go = el('a', { class: 'btn solid wide', target: '_blank', rel: 'noopener', href: '#' }, el('span', { text: 'Yahoo!乗換案内で検索' }), when);
  // アプリで開く（駅だけ入り、日時は入れ直しになる）
  const app = el('a', { class: 'tr-app', target: '_blank', rel: 'noopener', href: '#', text: 'アプリで開く（日時は入れ直し）' });

  const read = () => ({ from: ui.from.value.trim(), to: ui.to.value.trim(), date: ui.day.value, time: ui.time.value, mode: ui.how.value });
  const refresh = () => {
    const v = read();
    memo.set(e.id, v);
    const url = problem(v, ui) ? '' : transitUrl({ ...v, time: TIME.test(v.time) ? v.time : TRIP.defaultTime });
    go.href = url ? viaBrowser(url) : '#';
    app.href = url || '#';
    when.textContent = ISO.test(v.date) && (TIME.test(v.time) || fixedTime(v)) ? whenText(v) : '';
    ui.time.disabled = fixedTime(v);
    return v;
  };
  const chip = (name, km) => el('button', { type: 'button', class: 'pick', onclick: () => { ui.to.value = name; err.textContent = ''; refresh(); } },
    name, el('small', { text: km < 1 ? ` ${Math.round(km * 1000)}m` : ` ${km.toFixed(1)}km` }));

  const here = el('button', { type: 'button', class: 'btn', text: '現在地の駅', onclick: async (ev) => {
    const b = ev.currentTarget;
    b.disabled = true; err.textContent = '';
    try {
      const pos = await whereAmI();
      if (!inJapan(pos)) throw new Error('現在地が日本国外のため使えません。駅名を入力してください');
      const list = await nearStations(pos, 1);
      if (!list.length) throw new Error('近くの駅が見つかりませんでした。駅名を入力してください');
      ui.from.value = list[0].name; refresh();
    } catch (x) { err.textContent = x.message || '現在地を取得できませんでした'; }
    finally { b.disabled = false; }
  } });

  const form = el('form', { class: 'tform', novalidate: true },
    el('p', { class: 'help', text: e.place ? `行き先：${e.place}` : '' }),
    el('div', { class: 'tr-row' }, field('出発駅', ui.from), here),
    field('到着駅', ui.to), near,
    el('div', { class: 'tr-row dt' }, field('日付', ui.day), field('時刻', ui.time)),
    field('条件', ui.how),
    err, go, app);
  form.addEventListener('input', () => { err.textContent = ''; refresh(); });
  form.addEventListener('change', () => { err.textContent = ''; refresh(); });
  form.addEventListener('submit', (ev) => { ev.preventDefault(); go.click(); });
  go.addEventListener('click', (ev) => {
    const v = refresh();
    const bad = problem(v, ui);
    err.textContent = bad ? bad[0] : '';
    if (bad) { ev.preventDefault(); bad[1].focus(); return; }
    setOrigin(v.from);
  });
  app.addEventListener('click', (ev) => {
    const v = refresh();
    const bad = problem(v, ui);
    err.textContent = bad ? bad[0] : '';
    if (bad) { ev.preventDefault(); bad[1].focus(); return; }
    setOrigin(v.from);
  });

  const body = $('#tr-body');
  clear(body);
  body.append(form);
  refresh();
  showSheet(wrap);

  // 到着駅：会場表にあればそれ、なければ近い駅の候補を出す（入力済みなら上書きしない）
  getPos().then(async (pos) => {
    if (!pos || !form.isConnected) return;
    const list = pos.station ? [{ name: pos.station, km: pos.stationKm ?? 0 }] : await nearStations(pos, 3).catch(() => []);
    if (!list.length || !form.isConnected) return;
    if (!ui.to.value) { ui.to.value = list[0].name; refresh(); }
    near.replaceChildren(...list.map((s) => chip(s.name, s.km)));
  });
}
