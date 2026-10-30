// 「1時間ごとの天気」の画面（下から出る）。詳細の天気の日付をタップすると開く。
import { $, el, clear } from '../util/dom.js';
import { mountSheet, showSheet, hideSheet } from './sheet.js';
import { hourly, weatherLabel } from '../services/weather.js';

const MARKUP = `
  <div class="sheet" id="wh-sheet" role="dialog" aria-modal="true" aria-labelledby="wh-heading">
    <div class="sheet-head">
      <h2 id="wh-heading">1時間ごとの天気</h2>
      <button type="button" class="ghost" id="wh-close">閉じる</button>
    </div>
    <div id="wh-body"></div>
  </div>`;

let wrap = null;
let token = 0; // 開き直したときに、前の読み込みの結果を捨てる

export function initWeatherSheet() {
  wrap = mountSheet(MARKUP);
  $('#wh-close').addEventListener('click', () => hideSheet(wrap));
}

/** pos: 場所の緯度・経度。date: 日付（YYYY-MM-DD）。label: 画面に出す日付の文字。place: 場所の名前。 */
export function openWeatherSheet(pos, date, label, place) {
  const my = ++token;
  const body = $('#wh-body');
  clear(body);
  body.append(el('p', { class: 'wh-sub', text: `${label}　${place || ''}` }), el('p', { class: 'wh-msg', text: '読み込み中…' }));
  showSheet(wrap);
  hourly(pos, date).then((rows) => {
    if (my !== token) return;
    clear(body);
    body.append(el('p', { class: 'wh-sub', text: `${label}　${place || ''}` }));
    if (!rows.length) { body.append(el('p', { class: 'wh-msg', text: 'この日の天気は、まだ出ていません' })); return; }
    body.append(el('ul', { class: 'wh-list' }, rows.map((r) => {
      const { icon, label: word } = weatherLabel(r.code);
      return el('li', { class: 'wh-row', 'aria-label': `${r.hour}時 ${word} ${r.temp}度 降水確率${r.pop}%` },
        el('span', { class: 'wh-h', text: `${r.hour}時` }),
        el('span', { class: 'wh-i', 'aria-hidden': 'true', text: icon }),
        el('span', { class: 'wh-t', text: `${r.temp}°` }),
        el('span', { class: 'wh-w', text: word }),
        el('span', { class: 'wh-p', text: `降水 ${r.pop}%` }));
    })));
  }).catch(() => {
    if (my !== token) return;
    clear(body);
    body.append(el('p', { class: 'wh-msg', text: '取得できませんでした（通信を確認してください）' }));
  });
}
