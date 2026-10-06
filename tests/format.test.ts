import { it, expect } from 'vitest';
import { formatDuration, elapsedClock } from '../lib/format';
it('arredonda minutos com transporte e mostra timer de vários dias', () => {
  expect(formatDuration(1.999)).toBe('2h 00m');
  expect(formatDuration(null)).toBe('—');
  expect(elapsedClock(27.5)).toBe('27:30:00');
});
