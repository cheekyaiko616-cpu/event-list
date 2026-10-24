// 画面を試すための見本。実際の公式日程ではない（名前に「（例）」が付く）。
// 日付は「今日」からの日数で作るので、いつ開いても未来・過去の見え方を確認できる。
import { todayIso, addDaysIso } from '../util/date.js';

export function buildSamples() {
  const t = todayIso();
  const d = (n) => addDaysIso(t, n);
  return [
    { type: 'motor', title: 'スーパーGT 第◯戦（例）', date: d(-14), end: d(-13), place: '◯◯サーキット（例）', source: '公式サイト（例）' },
    { type: 'motor', title: 'スーパー耐久 最終戦（例）', date: d(21), end: d(22), place: '◯◯サーキット（例）', source: '公式サイト（例）' },
    { type: 'ado', title: 'Ado ライブ（例）', date: d(35), end: '', place: '◯◯アリーナ（例）', source: '公式サイト（例）' },
    { type: 'rept', title: '冬レプ 2026（例）', date: d(50), end: '', place: '◯◯会場（例）', source: '主催者の発表（例）' },
    { type: 'motor', title: 'WEC 第◯戦（例）', date: d(130), end: d(131), place: '◯◯サーキット（例）', source: '公式サイト（例）' },
    { type: 'rept', title: 'ナゴレプ 2027（例）', date: d(175), end: '', place: '名古屋（例）', source: '主催者の発表（例）' },
    { type: 'rept', title: '夏レプ 2027（例）', date: '', end: '', place: '', source: '' },
    { type: 'motor', title: 'スーパーGT 開幕戦 2027（例）', date: '', end: '', place: '', source: '' }
  ];
}
