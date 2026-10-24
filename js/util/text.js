// 文字・URL・ID まわりの小さな道具。

/** http / https のリンクだけを通す。それ以外（javascript: など）は空文字にする。 */
export function safeUrl(u) {
  if (!u) return '';
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '';
  } catch (e) {
    return '';
  }
}

export function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 名前に含まれる西暦を1年進める。無ければ fallbackYear を後ろに付ける。 */
export function bumpYear(title, fallbackYear) {
  if (/20\d{2}/.test(title)) return title.replace(/20\d{2}/, (y) => String(+y + 1));
  return fallbackYear ? `${title} ${fallbackYear}` : title;
}

/** ファイル名に使えない文字を外す。 */
export function safeFileName(s) {
  return (s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'event';
}
