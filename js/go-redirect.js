// 乗り換えの検索を、Yahoo!乗換案内のアプリではなくブラウザ版で開くための中継ページ（go.html）の動き。
// アプリで開くと日時が入らないため、いったんこのページを経由し、自動で移動してブラウザ版に渡す。
// 移動先は、Yahoo!乗換案内の検索結果ページだけに限る（ほかのアドレスには移動しない）。
const ALLOWED = 'https://transit.yahoo.co.jp/search/result?';

const target = new URLSearchParams(location.search).get('u') || '';
if (target.startsWith(ALLOWED)) {
  location.replace(target);
} else {
  document.getElementById('msg').textContent = '移動先が正しくありません。アプリに戻ってやり直してください。';
}
