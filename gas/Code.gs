/**
 * Seed セルフケアアプリ — Google Apps Script Web App エンドポイント
 *
 * デプロイ手順:
 *   1. 受け皿用のスプレッドシートを新規作成 (シート名は何でも OK、後で自動生成されます)
 *   2. メニュー「拡張機能」→「Apps Script」を開く
 *   3. このファイルの中身を Code.gs にまるごとコピペ
 *   4. SHEET_ID 定数に スプレッドシートID を入れる
 *      (URL の /d/ と /edit の間の長い文字列)
 *   5. 「デプロイ」→「新しいデプロイ」→ 種類 = ウェブアプリ
 *      - 説明: seed
 *      - 次のユーザーとして実行: 自分
 *      - アクセスできるユーザー: 全員
 *   6. 表示された Web App URL を Vite アプリの .env.local に貼る:
 *        VITE_SHEETS_ENDPOINT=https://script.google.com/macros/s/AKfycb.../exec
 *   7. アプリを再起動 (npm run dev) して気分を1件記録 → スプレッドシートに行が増えれば成功
 *
 * セキュリティ注意: URL を知っている人なら誰でも書き込める状態になります。
 * 個人で使う想定。共有する前に SHARED_SECRET を設定してアプリ側にも揃えると安全です (任意)。
 */

// 空にすると、このスクリプトが紐づいているスプレッドシート (拡張機能→Apps Script で
// 開いた親シート) を自動で使います。別シートに書き込みたい時だけ ID を入れてください。
const SHEET_ID = '';
const SHARED_SECRET = ''; // 任意。設定したらアプリ側からも同じ値を送る必要があります

// type → シート名 + ヘッダ
const TABS = {
  mood: {
    name: 'mood_logs',
    // note 列は削除済み — 自由記述は端末ローカル限定 (§13.8)
    headers: ['ts', 'client', 'nickname', 'mood', 'sleep', 'meal', 'exercise', 'condition', 'meds', 'raw'],
  },
  checkin: {
    name: 'attendance',
    headers: ['ts', 'client', 'nickname', 'event', 'mode', 'band', 'time'],
  },
  checkout: {
    name: 'attendance',
    headers: ['ts', 'client', 'nickname', 'event', 'mode', 'band', 'time'],
  },
  task: {
    name: 'tasks',
    headers: ['ts', 'client', 'nickname', 'taskId', 'name', 'impact', 'done'],
  },
  settings: {
    name: 'settings_changes',
    headers: ['ts', 'client', 'nickname', 'field', 'value'],
  },
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json({ ok: false, error: 'no body' });
    }
    const body = JSON.parse(e.postData.contents);

    if (SHARED_SECRET && body.secret !== SHARED_SECRET) {
      return _json({ ok: false, error: 'unauthorized' });
    }

    const tab = TABS[body.type];
    if (!tab) {
      return _json({ ok: false, error: 'unknown type: ' + body.type });
    }

    const sheet = _ensureSheet(tab.name, tab.headers);
    const row = _rowFor(body, tab.headers);
    sheet.appendRow(row);

    return _json({ ok: true, type: body.type, ts: body.ts });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  // 動作確認用 (ブラウザでURLを開いたとき用)
  return _json({ ok: true, app: 'seed', endpoint: 'use POST' });
}

function _openSpreadsheet() {
  const id = (SHEET_ID || '').trim();
  if (id && id !== 'PASTE_YOUR_SPREADSHEET_ID_HERE') {
    return SpreadsheetApp.openById(id);
  }
  // 親スプレッドシート (container-bound script の場合)
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      'SHEET_ID を入れるか、スプレッドシートの「拡張機能→Apps Script」から開いた状態でデプロイしてください'
    );
  }
  return active;
}

function _ensureSheet(name, headers) {
  const ss = _openSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function _rowFor(body, headers) {
  const ts = body.ts || new Date().toISOString();
  const client = body.client || '';
  const nickname = body.nickname || '';
  const p = body.payload || {};

  switch (body.type) {
    case 'mood': {
      const sel = p.selections || {};
      const join = (v) => Array.isArray(v) ? v.join(',') : (v == null ? '' : String(v));
      // note は送信ペイロードに含まれないため列から除外
      return [
        ts, client, nickname, p.mood || '',
        join(sel.sleep), join(sel.meal), join(sel.exercise),
        join(sel.condition), join(sel.meds),
        JSON.stringify(p),
      ];
    }
    case 'checkin':
    case 'checkout':
      return [ts, client, nickname, body.type, p.mode || '', p.band || '', p.time || ''];
    case 'task':
      return [ts, client, nickname, p.taskId || '', p.name || '', p.impact || '', p.done ? 'done' : 'undone'];
    case 'settings':
      return [ts, client, nickname, p.field || '', JSON.stringify(p.value)];
    default:
      return [ts, client, nickname, JSON.stringify(body)];
  }
  // headers 引数は将来の動的拡張用 (現在は switch で固定)
  void headers;
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
