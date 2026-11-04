// タブの色。保存する値は、見本の番号（1〜COLORS）か、好きな色（#rrggbb）。
// 画面では CSS の --c に入れて使う。好きな色は、明るい／暗い画面のどちらでも読めるよう、文字色（--fg）を少し混ぜる。
import { COLORS } from '../config.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** 保存する色の値を整える。正しくなければ fallback。 */
export function normalizeColor(v, fallback = COLORS) {
  if (Number.isInteger(v) && v >= 1 && v <= COLORS) return v;
  if (typeof v === 'string' && HEX.test(v)) return v.toLowerCase();
  return fallback;
}

/** CSS の --c に入れる値。色が無ければ薄い灰色。 */
export function colorCss(color) {
  if (Number.isInteger(color) && color >= 1 && color <= COLORS) return `var(--c${color})`;
  if (typeof color === 'string' && HEX.test(color)) return `color-mix(in srgb, ${color.toLowerCase()} 72%, var(--fg))`;
  return 'var(--muted)';
}

/** タブ（無ければ null）の --c の値。 */
export const tabColorCss = (tab) => (tab ? colorCss(tab.color) : 'var(--muted)');
