import { formatDuration, formatRemaining, NARROW_SPACE } from './planDurations';

const MIN = 60 * 1000;

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
