import { describe, it, expect } from 'vitest';
import { REGIONS, pressureCare } from './regions';

describe('REGIONS', () => {
  it('8 地域が定義されている', () => {
    expect(Object.keys(REGIONS)).toHaveLength(8);
  });

  it('各地域に label と pressure がある', () => {
    for (const info of Object.values(REGIONS)) {
      expect(info.label).toBeTruthy();
      expect(typeof info.pressure).toBe('number');
    }
  });
});

describe('pressureCare', () => {
  it('1005 未満は warn (低気圧)', () => {
    expect(pressureCare(1000, 'stable').tone).toBe('warn');
    expect(pressureCare(1004, 'down').tone).toBe('warn');
  });

  it('下降傾向で 1012 未満は soft', () => {
    expect(pressureCare(1010, 'down').tone).toBe('soft');
  });

  it('1015 以上は good (安定)', () => {
    expect(pressureCare(1015, 'stable').tone).toBe('good');
    expect(pressureCare(1020, 'up').tone).toBe('good');
  });

  it('それ以外はおだやか (soft)', () => {
    expect(pressureCare(1013, 'stable').tone).toBe('soft');
    expect(pressureCare(1013, 'up').tone).toBe('soft');
  });

  it('すべての分岐でメッセージが空でない', () => {
    for (const p of [1000, 1010, 1013, 1020]) {
      expect(pressureCare(p, 'down').msg.length).toBeGreaterThan(0);
    }
  });
});
