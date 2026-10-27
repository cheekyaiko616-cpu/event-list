// ファイルを端末に渡す処理。iPhone では共有シート（「ファイルに保存」など）を優先する。

function triggerAnchor(url, setup) {
  const a = document.createElement('a');
  a.href = url;
  setup(a);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadBlob(blob, filename) {
  triggerAnchor(URL.createObjectURL(blob), (a) => { a.download = filename; });
}

/**
 * ファイルを保存する。共有シートが使えれば出し、使えなければダウンロードする。
 * 戻り値: 'shared' | 'cancelled' | 'downloaded'
 * ※ 共有シートはボタンを押した直後でないと開けないので、この関数の前に await を挟まないこと。
 */
export async function saveFile({ filename, mime, text }) {
  const blob = new Blob([text], { type: mime });
  const file = typeof File === 'function' ? new File([blob], filename, { type: mime }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
