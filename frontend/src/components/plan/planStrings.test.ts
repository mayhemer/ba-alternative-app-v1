import { formatDayTitle, formatDuration, formatRemaining, NARROW_SPACE, planStrings } from './planStrings';
import { getFestivalDayStart } from '../timeline/timelineLayout';

const MIN = 60 * 1000;
const THU = getFestivalDayStart(Date.parse('2025-08-07T12:00:00+02:00'));

describe('formatDuration', () => {
  it('uses minutes under an hour', () => {
    expect(formatDuration(37 * MIN)).toBe('37 min');
    expect(formatDuration(5 * MIN)).toBe('5 min');
  });

  it('uses hours and zero-padded minutes from an hour up', () => {
    expect(formatDuration(80 * MIN)).toBe('1 h 20');
    expect(formatDuration(65 * MIN)).toBe('1 h 05');
  });

  it('drops the minutes on a whole hour', () => {
    expect(formatDuration(180 * MIN)).toBe('3 h');
  });
});

describe('formatRemaining', () => {
  it('prefixes the time left with a real minus sign', () => {
    expect(formatRemaining(37 * MIN)).toBe('−37 min');
    expect(formatRemaining(80 * MIN)).toBe('−1 h 20');
  });

  it('joins the numbers and units with a narrow no-break space when asked', () => {
    expect(formatRemaining(37 * MIN, NARROW_SPACE)).toBe('−37\u202Fmin');
    expect(formatRemaining(80 * MIN, NARROW_SPACE)).toBe('−1\u202Fh\u202F20');
    expect(formatRemaining(180 * MIN, NARROW_SPACE)).toBe('−3\u202Fh');
  });
});

describe('formatDayTitle', () => {
  it('spells out the weekday, with the date in the language\'s style', () => {
    expect(formatDayTitle(THU, 'en')).toEqual({ weekday: 'Thursday', date: '7 Aug' });
    expect(formatDayTitle(THU, 'cs')).toEqual({ weekday: 'Čtvrtek', date: '7. 8.' });
  });
});

describe('planStrings', () => {
  it('has every English string in Czech too', () => {
    const en = planStrings('en');
    const cs = planStrings('cs');
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
    expect(en.live).toBe('LIVE');
    expect(cs.live).toBe('HRAJE');
  });

  it('falls back to English for an unknown language', () => {
    expect(planStrings('de')).toEqual(planStrings('en'));
  });
});
