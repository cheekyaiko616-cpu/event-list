// 日付の計算・並び方・月と週のまとめ方の自動テスト。実行: node tools/test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, addDaysIso, eventEnd, compareEvents } from '../js/util/date.js';
import { weekStart, placeDate, groupByMonth, groupByWeek } from '../js/util/group.js';
import { closeDeadlines } from '../js/data/dates.js';

test('実在しない日付・空欄は null', () => {
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate(''), null);
  assert.deepEqual({ ...parseDate('2026-11-04') }, { y: 2026, m: 11, d: 4 });
});

test('日数の足し算は月・年をまたぐ', () => {
  assert.equal(addDaysIso('2026-11-30', 1), '2026-12-01');
  assert.equal(addDaysIso('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28');
});

test('最終日は終了日、無ければ開始日', () => {
  assert.equal(eventEnd({ date: '2026-09-19', end: '2026-11-29' }), '2026-11-29');
  assert.equal(eventEnd({ date: '2026-09-19' }), '2026-09-19');
  assert.equal(eventEnd({ date: '2026-09-19', end: '2026-09-01' }), '2026-09-19'); // 終了が開始より前なら無視
});

test('並びは日付順、同じ日は名前順', () => {
  const a = { date: '2026-11-07', title: 'い' }, b = { date: '2026-11-05', title: 'z' }, c = { date: '2026-11-07', title: 'あ' };
  assert.deepEqual([a, b, c].sort(compareEvents).map((x) => x.title), ['z', 'あ', 'い']);
});

test('週の始まりは月曜（日曜は前の週）', () => {
  assert.equal(weekStart('2026-11-04'), '2026-11-02'); // 水
  assert.equal(weekStart('2026-11-02'), '2026-11-02'); // 月
  assert.equal(weekStart('2026-11-08'), '2026-11-02'); // 日
  assert.equal(weekStart('2027-01-01'), '2026-12-28'); // 年またぎ
});

test('今週より前に始まって続く予定は今日の位置に置く', () => {
  const today = '2026-11-04';
  assert.equal(placeDate({ date: '2026-09-19' }, today), today);
  assert.equal(placeDate({ date: '2026-11-02' }, today), '2026-11-02'); // 今週の月曜は、そのまま
  assert.equal(placeDate({ date: '2026-11-07' }, today), '2026-11-07');
});

test('月ごと・週ごとにまとめる（年またぎ）', () => {
  const ev = ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-04'].map((date) => ({ date }));
  const months = groupByMonth(ev);
  assert.deepEqual(months.map((g) => [g.y, g.m, g.items.length]), [[2026, 12, 2], [2027, 1, 2]]);
  const weeks = groupByWeek(ev);
  assert.deepEqual(weeks.map((g) => [g.start, g.items.length]), [['2026-12-28', 3], ['2027-01-04', 1]]);
});

test('続いている予定は、置く日付でまとめる', () => {
  const today = '2026-11-04';
  const ev = [{ date: '2026-09-19', end: '2026-11-29' }, { date: '2026-11-05' }];
  const key = (e) => placeDate(e, today);
  const months = groupByMonth(ev, key);
  assert.equal(months.length, 1);
  assert.equal(months[0].m, 11);
  assert.equal(groupByWeek(months[0].items, key).length, 1);
});

test('申込締切は、今日以降だけを近い順に並べる（1件の予定につき1つ）', () => {
  const ev = [
    { id: 'a', dates: [{ kind: 'close', date: '2099-12-31' }] },
    { id: 'b', dates: [{ kind: 'close', date: '2000-01-01' }] },                                   // 過去は除く
    { id: 'c', dates: [{ kind: 'open', date: '2099-01-01' }, { kind: 'close', date: '2099-03-01' }, { kind: 'close', date: '2099-05-01' }] }, // 近い締切だけ
    { id: 'd', dates: [{ kind: 'result', date: '2099-02-01' }] },                                   // 締切でなければ除く
    { id: 'e' }
  ];
  assert.deepEqual(closeDeadlines(ev).map((x) => [x.e.id, x.d.date]), [['c', '2099-03-01'], ['a', '2099-12-31']]);
  assert.deepEqual(closeDeadlines([]), []);
});
