import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import { MOODS } from '../../data/moods';
import type { StoredDailyRecord } from '../../data/store';
import { SECTION_TITLE, NOTE_COPY } from '../../data/historyCopy';
import { SectionCard, EmptyNote } from './parts';

// さいきんのきろく + 自由記述折りたたみ (T7)。
export function RecentRecords({ records }: { records: StoredDailyRecord[] }) {
  const recent = records.slice(-5).reverse();

  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: PALETTE.ink,
          marginBottom: 8,
        }}
      >
        {SECTION_TITLE.recent}
      </div>
      {recent.length === 0 ? (
        <SectionCard>
          <EmptyNote text="まだ記録がありません。" />
        </SectionCard>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 12,
          }}
        >
          {recent.map((d) => (
            <RecentRow key={d.date} record={d} />
          ))}
        </div>
      )}
    </>
  );
}

function RecentRow({ record }: { record: StoredDailyRecord }) {
  // 自由記述 note は既定で非表示。本人が「メモを読む」を押したときだけ表示する。
  const [noteOpen, setNoteOpen] = useState(false);
  const moodObj = MOODS.find((m) => m.v === record.mood) ?? MOODS[2];
  const hasNote = typeof record.note === 'string' && record.note.trim() !== '';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 22 }}>{moodObj.face}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{record.date}</div>
          <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}>
            {moodObj.label}
            {record.sleep?.bedtime && ` · 入眠 ${record.sleep.bedtime}`}
          </div>
        </div>
        {hasNote && (
          <button
            onClick={() => setNoteOpen((v) => !v)}
            style={{
              border: 'none',
              cursor: 'pointer',
              background: PALETTE.sageSoft,
              color: PALETTE.sageDeep,
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              whiteSpace: 'nowrap',
            }}
          >
            {noteOpen ? NOTE_COPY.close : NOTE_COPY.open}
          </button>
        )}
      </div>
      {/* note 本文は折りたたみを開いたときだけ描画。先頭抜粋・プレビューは出さない。 */}
      {hasNote && noteOpen && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: PALETTE.creamSoft,
            borderRadius: 10,
            fontSize: 11,
            color: PALETTE.ink,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {record.note}
        </div>
      )}
    </div>
  );
}
