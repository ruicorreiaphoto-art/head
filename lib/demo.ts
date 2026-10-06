import { Data, emptyData, emptyLog, dayKey } from './model';
export function demoData(now = new Date()): Data {
  const d = emptyData('demo');
  d.settings.onboarded = true;
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(20, 0, 0, 0);
    const date = dayKey(day);
    const attack = [25, 19, 12, 6, 2].includes(i);
    const warning = [26, 20, 13, 7, 3].includes(i);
    const log = emptyLog(date, d.settings);
    Object.assign(log, {
      id: `demo-log-${i}`,
      recordedAt: day.toISOString(),
      state: attack
        ? 'migraine'
        : warning
          ? 'symptoms'
          : i === 1
            ? 'recovery'
            : 'normal',
      pain: attack ? 5 + (i % 4) : warning ? 2 : 0,
      energy: attack ? 3 : 6 + (i % 4),
      sleepHours: 6.2 + (i % 4) * 0.5,
      sleepiness: warning ? 7 : 2,
      neck: warning ? 6 : 1,
      stress: attack ? 7 : 3 + (i % 3),
      water: attack ? 1.2 : 1.8 + (i % 3) * 0.2,
      coffees: ['10:30', '14:00'],
      breakfast: '08:15',
      lunch: attack ? '14:30' : '13:00',
      dinner: '20:00',
      lateMeal: attack,
      triggers: attack ? ['Stress', 'Pouco sono'] : [],
      premonitory: warning ? ['Sonolência', 'Rigidez no pescoço'] : [],
      incoming: warning,
      incomingAt: warning ? day.toISOString() : null,
      notes: attack
        ? 'Pressão atrás do olho esquerdo após almoço.'
        : warning
          ? 'Fadiga e tensão cervical durante a tarde.'
          : '',
      exercise: i % 3 === 0 ? 'walk' : 'none',
      exerciseMinutes: i % 3 === 0 ? 30 : 0,
      screenHours: 6 + (i % 4),
    });
    d.logs.push(log);
    const medAt = new Date(day);
    medAt.setHours(8, 5);
    d.intakes.push({
      id: `demo-preventive-${i}`,
      medicationId: 'atogepant',
      name: 'Atogepant',
      kind: 'preventive',
      at: medAt.toISOString(),
      dosage: '',
      effectiveness: null,
      improvementMinutes: null,
      secondDose: false,
      notes: '',
    });
    d.events.push(
      {
        id: `demo-wake-${i}`,
        at: new Date(`${date}T07:30:00`).toISOString(),
        type: 'wake',
        text: 'Acordar',
      },
      {
        id: `demo-coffee-${i}`,
        at: new Date(`${date}T10:30:00`).toISOString(),
        type: 'coffee',
        text: 'Café',
      },
    );
    if (attack) {
      const start = new Date(`${date}T15:10:00`);
      const end = new Date(start.getTime() + (3 + (i % 4)) * 3600000);
      d.attacks.push({
        id: `demo-attack-${i}`,
        start: start.toISOString(),
        end: end.toISOString(),
        intensity: 5 + (i % 4),
        maxIntensity: 5 + (i % 4),
        symptoms: ['Sensibilidade à luz', 'Náusea'],
        locations: ['Atrás dos olhos'],
        triggers: ['Stress', 'Pouco sono'],
        notes: 'Crise após um dia de trabalho intenso.',
        effectiveness: 7,
        residual: 'Fadiga ligeira',
      });
      d.intakes.push({
        id: `demo-rescue-${i}`,
        medicationId: 'zolmitriptan',
        name: 'Zolmitriptan',
        kind: 'rescue',
        at: new Date(start.getTime() + 900000).toISOString(),
        dosage: '',
        effectiveness: 7,
        improvementMinutes: 45,
        secondDose: false,
        notes: '',
      });
    }
  }
  return d;
}
