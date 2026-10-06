import {
  Data,
  Attack,
  attackOnDate,
  durationHours,
  DailyLog,
  emptyLog,
  stateOnDate,
} from './model';
export const mean = (values: number[]) =>
  values.length ? values.reduce((s, n) => s + n, 0) / values.length : null;
export function inPeriod(at: string, from: string, to: string) {
  return at.slice(0, 10) >= from && at.slice(0, 10) <= to;
}
const byLocalDate = (at: string) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function report(data: Data, from: string, to: string) {
  const attacks = data.attacks.filter((a) =>
    inPeriod(byLocalDate(a.start), from, to),
  );
  const logs = data.logs.filter((l) => inPeriod(l.date, from, to));
  const intakes = data.intakes.filter((i) =>
    inPeriod(byLocalDate(i.at), from, to),
  );
  const counts = (items: string[]) =>
    Object.entries(
      items.reduce<Record<string, number>>(
        (acc, s) => ((acc[s] = (acc[s] ?? 0) + 1), acc),
        {},
      ),
    ).sort((a, b) => b[1] - a[1]);
  const closed = attacks.filter((a) => a.end);
  return {
    from,
    to,
    attacks,
    logs,
    intakes,
    total: attacks.length,
    completed: closed.length,
    avgDuration: mean(closed.map((a) => durationHours(a))),
    avgIntensity: mean(attacks.map((a) => a.maxIntensity)),
    avgSleep: mean(logs.map((l) => l.sleepHours)),
    avgStress: mean(logs.map((l) => l.stress)),
    effectiveness: mean(
      intakes.flatMap((i) =>
        i.effectiveness === null ? [] : [i.effectiveness],
      ),
    ),
    medications: counts(intakes.map((i) => i.name)),
    symptoms: counts([
      ...attacks.flatMap((a) => a.symptoms),
      ...logs.flatMap((l) => l.premonitory),
    ]),
    triggers: counts([
      ...attacks.flatMap((a) => a.triggers),
      ...logs.flatMap((l) => l.triggers),
    ]),
    startHours: counts(
      attacks.map(
        (a) => String(new Date(a.start).getHours()).padStart(2, '0') + ':00',
      ),
    ),
    weekdays: counts(
      attacks.map((a) =>
        new Date(a.start).toLocaleDateString('pt-PT', { weekday: 'long' }),
      ),
    ),
    observations: logs
      .filter((l) => l.notes)
      .map((l) => `${l.date}: ${l.notes}`),
  };
}
export function association(
  data: Data,
  logs: DailyLog[],
  get: (l: DailyLog) => number | boolean | null,
) {
  const groups: [number[], number[]] = [[], []];
  for (const l of logs) {
    const value = get(l);
    if (value === null) continue;
    groups[
      data.attacks.some((a) => attackOnDate(a, l.date)) ||
      l.state === 'migraine'
        ? 1
        : 0
    ].push(Number(value));
  }
  return {
    withMigraine: mean(groups[1]),
    withoutMigraine: mean(groups[0]),
    nWith: groups[1].length,
    nWithout: groups[0].length,
  };
}
export function preAnalysis(data: Data, attacks: Attack[], hours: number) {
  const observations = [
    ...data.observations.map((o) => ({ ...o.log, recordedAt: o.at })),
    ...data.logs.filter(
      (l) =>
        !data.observations.some(
          (o) => o.log.id === l.id && o.at === l.recordedAt,
        ),
    ),
  ];
  const samples = attacks
    .map((a) =>
      observations.filter((l) => {
        const delta =
          new Date(a.start).getTime() - new Date(l.recordedAt).getTime();
        return delta > 0 && delta <= hours * 3600000;
      }),
    )
    .filter((ls) => ls.length);
  const signals: [string, (l: DailyLog) => boolean][] = [
    [
      'Sonolência',
      (l) => l.sleepiness >= 5 || l.premonitory.includes('Sonolência'),
    ],
    [
      'Tensão cervical',
      (l) => l.neck >= 5 || l.premonitory.includes('Rigidez no pescoço'),
    ],
    ['Energia baixa', (l) => l.energy <= 3],
    ['Refeição tardia', (l) => l.lateMeal],
    ['Stress elevado', (l) => l.stress >= 7],
    ...[
      'Fadiga',
      'Bocejos',
      'Irritabilidade',
      'Fome',
      'Cravings',
      'Sede',
      'Dificuldade de concentração',
      'Desconforto geral',
      'Sensibilidade à luz',
      'Sensibilidade ao som',
      'Alterações de humor',
    ].map(
      (s) =>
        [s, (l: DailyLog) => l.premonitory.includes(s)] as [
          string,
          (l: DailyLog) => boolean,
        ],
    ),
  ];
  return {
    covered: samples.length,
    total: attacks.length,
    signals: signals.map(([label, fn]) => ({
      label,
      count: samples.filter((ls) => ls.some(fn)).length,
      percent: samples.length
        ? (samples.filter((ls) => ls.some(fn)).length / samples.length) * 100
        : null,
    })),
  };
}
export function incomingFollowed(data: Data) {
  const observations = Array.from(
    new Map(
      [...data.observations.map((o) => o.log), ...data.logs]
        .filter((l) => l.incoming && l.incomingAt)
        .map((l) => [l.id + ':' + l.incomingAt, l]),
    ).values(),
  );
  return {
    total: observations.length,
    followed: observations.filter((l) =>
      data.attacks.some((a) => {
        const delta =
          new Date(a.start).getTime() - new Date(l.incomingAt!).getTime();
        return delta > 0 && delta <= 86400000;
      }),
    ).length,
  };
}
export function streak(data: Data, now = new Date()) {
  let count = 0;
  const d = new Date(now);
  for (let i = 0; i < 3660; i++) {
    const date = byLocalDate(d.toISOString());
    if (
      data.attacks.some((a) => attackOnDate(a, date, now)) ||
      data.logs.find((l) => l.date === date)?.state === 'migraine'
    )
      break;
    if (!data.logs.some((l) => l.date === date)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
export function searchData(data: Data, query: string) {
  const q = query.toLowerCase().trim();
  const shortSleep =
    /^(?:sleep less than|sono menos de)\s*(\d+(?:\.\d+)?)h?$/.exec(q);
  if (shortSleep)
    return data.logs.filter((l) => l.sleepHours < Number(shortSleep[1]));
  const contains = (item: unknown) =>
    JSON.stringify(item).toLowerCase().includes(q);
  const dates = new Set(
    data.logs.filter((l) => contains(l)).map((l) => l.date),
  );
  for (const intake of data.intakes.filter(contains))
    dates.add(byLocalDate(intake.at));
  for (const attack of data.attacks.filter(contains)) {
    dates.add(byLocalDate(attack.start));
    for (const log of data.logs)
      if (attackOnDate(attack, log.date)) dates.add(log.date);
  }
  for (const event of data.events.filter(contains))
    dates.add(byLocalDate(event.at));
  return Array.from(dates)
    .sort()
    .reverse()
    .map(
      (date) =>
        data.logs.find((l) => l.date === date) ?? {
          ...emptyLog(date, data.settings),
          id: 'search-' + date,
          state: stateOnDate(data, date) === 'migraine' ? 'migraine' : 'normal',
          notes: 'Eventos registados neste dia. Sem check-in diário.',
        },
    );
}
