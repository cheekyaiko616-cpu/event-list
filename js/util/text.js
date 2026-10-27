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
