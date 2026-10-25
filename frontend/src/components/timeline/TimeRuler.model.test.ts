import { hourTickModels } from './TimeRuler.model';

// ── The ruler's hour ticks, as models ─────────────────────────────────────────

describe('hourTickModels', () => {
  const ticks = hourTickModels();

  it('runs from 06:00 to the next 06:00, one tick an hour, 170 px apart', () => {
    expect(ticks).toHaveLength(25);
    expect(ticks[0]).toEqual({ key: 0, x: 0, label: '06:00' });
    expect(ticks[1]).toEqual({ key: 1, x: 170, label: '07:00' });
    expect(ticks[24]).toEqual({ key: 24, x: 4080, label: '06:00' });
  });

  it('wraps past midnight', () => {
    expect([ticks[17].label, ticks[18].label, ticks[19].label]).toEqual(['23:00', '00:00', '01:00']);
  });
});
