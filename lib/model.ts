import { z } from 'zod';
const score = z.number().min(0).max(10);
const timestamp = z.string().datetime({ offset: true });
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => dayKey(new Date(`${s}T12:00:00`)) === s, 'Data inválida');
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .or(z.literal(''));
export const logSchema = z.object({
  id: z.string(),
  date,
  recordedAt: timestamp,
  state: z.enum(['normal', 'symptoms', 'migraine', 'recovery']),
  pain: score,
  energy: score,
  sleepiness: score,
  nausea: score,
  light: score,
  sound: score,
  neck: score,
  stress: score,
  missedMedications: z.array(z.string()).default([]),
  locations: z.array(z.string()),
  painType: z.string(),
  visual: z.array(z.string()),
  cognitive: z.array(z.string()),
  mood: z.string(),
  bedtime: time,
  wakeTime: time,
  sleepHours: z.number().min(0).max(24),
  sleepQuality: score,
  wokeNight: z.boolean(),
  difficultySleeping: z.boolean(),
  premonitory: z.array(z.string()),
  incoming: z.boolean(),
  incomingAt: timestamp.nullable(),
  triggers: z.array(z.string()),
  triggerNotes: z.string(),
  breakfast: time,
  lunch: time,
  dinner: time,
  snacks: z.string(),
  skippedMeal: z.boolean(),
  lateMeal: z.boolean(),
  heavyMeal: z.boolean(),
  foodNotes: z.string(),
  water: z.number().min(0).max(20),
  coffees: z.array(time),
  exercise: z.string(),
  exerciseMinutes: z.number().min(0).max(1440),
  exerciseIntensity: z.string(),
  screenLevel: z.string(),
  screenHours: z.number().min(0).max(24),
  notes: z.string(),
  weather: z
    .object({
      temperature: z.number(),
      pressure: z.number(),
      humidity: z.number(),
      rain: z.number(),
      pressureChange: z.number().nullable(),
      source: z.string(),
    })
    .nullable(),
});
export const medicationSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  kind: z.enum(['preventive', 'rescue', 'other']),
  dosage: z.string(),
});
export const intakeSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  name: z.string(),
  kind: z.enum(['preventive', 'rescue', 'other']),
  at: timestamp,
  dosage: z.string(),
  effectiveness: score.nullable(),
  improvementMinutes: z.number().min(0).nullable(),
  secondDose: z.boolean(),
  notes: z.string(),
});
export const attackSchema = z
  .object({
    id: z.string(),
    start: timestamp,
    end: timestamp.nullable(),
    intensity: score,
    maxIntensity: score,
    symptoms: z.array(z.string()),
    locations: z.array(z.string()),
    triggers: z.array(z.string()),
    notes: z.string(),
    effectiveness: score.nullable(),
    residual: z.string(),
  })
  .superRefine((a, ctx) => {
    if (a.end && new Date(a.end) < new Date(a.start))
      ctx.addIssue({
        code: 'custom',
        message: 'O fim deve ser posterior ao início',
      });
    if (a.maxIntensity < a.intensity)
      ctx.addIssue({ code: 'custom', message: 'Intensidade máxima inválida' });
  });
export const eventSchema = z.object({
  id: z.string(),
  at: timestamp,
  type: z.string(),
  text: z.string(),
});
export const settingsSchema = z.object({
  onboarded: z.boolean(),
  wake: time,
  bed: time,
  usualCoffee: z.number().min(0).max(30),
  checkIn: time,
  weatherEnabled: z.boolean(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  reminders: z.boolean(),
  morning: time,
  evening: time,
  medicationReminder: time,
});
export const dataSchema = z
  .object({
    version: z.literal(1),
    mode: z.enum(['personal', 'demo']),
    logs: z.array(logSchema),
    attacks: z.array(attackSchema),
    medications: z.array(medicationSchema),
    intakes: z.array(intakeSchema),
    events: z.array(eventSchema),
    observations: z
      .array(z.object({ id: z.string(), at: timestamp, log: logSchema }))
      .default([]),
    settings: settingsSchema,
  })
  .superRefine((d, ctx) => {
    for (const k of [
      'logs',
      'attacks',
      'medications',
      'intakes',
      'events',
      'observations',
    ] as const) {
      if (new Set(d[k].map((x) => x.id)).size !== d[k].length)
        ctx.addIssue({ code: 'custom', message: `IDs duplicados: ${k}` });
    }
    if (new Set(d.logs.map((l) => l.date)).size !== d.logs.length)
      ctx.addIssue({ code: 'custom', message: 'Registos diários duplicados' });
    if (d.attacks.filter((a) => !a.end).length > 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Só pode existir uma crise activa',
      });
  });
export type DailyLog = z.infer<typeof logSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type Intake = z.infer<typeof intakeSchema>;
export type Attack = z.infer<typeof attackSchema>;
export type Data = z.infer<typeof dataSchema>;
export const uid = () => crypto.randomUUID();
export function emptyData(mode: Data['mode'] = 'personal'): Data {
  return {
    version: 1,
    mode,
    logs: [],
    attacks: [],
    intakes: [],
    events: [],
    observations: [],
    medications: [
      { id: 'atogepant', name: 'Atogepant', kind: 'preventive', dosage: '' },
      { id: 'zolmitriptan', name: 'Zolmitriptan', kind: 'rescue', dosage: '' },
    ],
    settings: {
      onboarded: false,
      wake: '07:30',
      bed: '23:30',
      usualCoffee: 2,
      checkIn: '20:00',
      weatherEnabled: false,
      latitude: null,
      longitude: null,
      reminders: false,
      morning: '08:00',
      evening: '20:00',
      medicationReminder: '08:05',
    },
  };
}
export function emptyLog(
  dateValue = dayKey(),
  settings = emptyData().settings,
): DailyLog {
  return {
    id: uid(),
    date: dateValue,
    recordedAt: new Date().toISOString(),
    state: 'normal',
    pain: 0,
    energy: 7,
    sleepiness: 0,
    nausea: 0,
    light: 0,
    sound: 0,
    neck: 0,
    stress: 0,
    missedMedications: [],
    locations: [],
    painType: '',
    visual: [],
    cognitive: [],
    mood: 'normal',
    bedtime: settings.bed,
    wakeTime: settings.wake,
    sleepHours: sleepDuration(settings.bed, settings.wake),
    sleepQuality: 7,
    wokeNight: false,
    difficultySleeping: false,
    premonitory: [],
    incoming: false,
    incomingAt: null,
    triggers: [],
    triggerNotes: '',
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    skippedMeal: false,
    lateMeal: false,
    heavyMeal: false,
    foodNotes: '',
    water: 0,
    coffees: [],
    exercise: 'none',
    exerciseMinutes: 0,
    exerciseIntensity: 'easy',
    screenLevel: 'normal',
    screenHours: 0,
    notes: '',
    weather: null,
  };
}
export function sleepDuration(bed: string, wake: string) {
  if (!bed || !wake) return 0;
  const minutes = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  return (
    Math.round((((minutes(wake) - minutes(bed) + 1440) % 1440) / 60) * 100) /
    100
  );
}
export function durationHours(attack: Attack, now = new Date()) {
  return Math.max(
    0,
    (new Date(attack.end ?? now).getTime() - new Date(attack.start).getTime()) /
      3600000,
  );
}
export function event(
  data: Data,
  type: string,
  text: string,
  at = new Date().toISOString(),
): Data {
  return { ...data, events: [...data.events, { id: uid(), at, type, text }] };
}
export function saveLog(data: Data, log: DailyLog): Data {
  const valid = logSchema.parse(log);
  return {
    ...data,
    logs: [...data.logs.filter((l) => l.date !== valid.date), valid],
    observations: [
      ...data.observations,
      { id: uid(), at: valid.recordedAt, log: structuredClone(valid) },
      ...(valid.incoming &&
      valid.incomingAt &&
      valid.incomingAt !== valid.recordedAt &&
      !data.observations.some(
        (o) => o.log.id === valid.id && o.at === valid.incomingAt,
      )
        ? [{ id: uid(), at: valid.incomingAt, log: structuredClone(valid) }]
        : []),
    ],
  };
}
export function startAttack(
  data: Data,
  fields: Partial<Attack> = {},
  now = new Date(),
): Data {
  if (data.attacks.some((a) => !a.end))
    throw new Error('Já existe uma crise activa.');
  const a = attackSchema.parse({
    id: uid(),
    start: now.toISOString(),
    end: null,
    intensity: 5,
    maxIntensity: 5,
    symptoms: [],
    locations: [],
    triggers: [],
    notes: '',
    effectiveness: null,
    residual: '',
    ...fields,
  });
  return event(
    { ...data, attacks: [...data.attacks, a] },
    'migraine',
    'Crise iniciada',
    a.start,
  );
}
export function updateAttack(
  data: Data,
  id: string,
  fields: Partial<Attack>,
): Data {
  return {
    ...data,
    attacks: data.attacks.map((a) =>
      a.id === id
        ? attackSchema.parse({
            ...a,
            ...fields,
            maxIntensity: Math.max(
              a.maxIntensity,
              fields.intensity ?? a.intensity,
              fields.maxIntensity ?? 0,
            ),
          })
        : a,
    ),
  };
}
export function endAttack(
  data: Data,
  fields: Partial<Attack> = {},
  now = new Date(),
): Data {
  const a = data.attacks.find((a) => !a.end);
  if (!a) throw new Error('Não existe crise activa.');
  return event(
    updateAttack(data, a.id, { ...fields, end: now.toISOString() }),
    'migraine',
    'Crise terminada',
    now.toISOString(),
  );
}
export function takeMedication(data: Data, intake: Intake): Data {
  const i = intakeSchema.parse(intake);
  if (!data.medications.some((m) => m.id === i.medicationId))
    throw new Error('Medicação desconhecida');
  const date = dayKey(new Date(i.at));
  const logs = data.logs.map((l) =>
    l.date === date
      ? {
          ...l,
          missedMedications: l.missedMedications.filter(
            (name) => name !== i.name,
          ),
        }
      : l,
  );
  return event(
    { ...data, logs, intakes: [...data.intakes, i] },
    'medication',
    `${i.name}${i.dosage ? ' · ' + i.dosage : ''}`,
    i.at,
  );
}
export function attackOnDate(a: Attack, date: string, now = new Date()) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return new Date(a.start) < end && new Date(a.end ?? now) >= start;
}
export function stateOnDate(d: Data, date: string) {
  if (d.attacks.some((a) => attackOnDate(a, date))) return 'migraine';
  return d.logs.find((l) => l.date === date)?.state ?? 'missing';
}
export const labels: Record<string, string> = {
  normal: 'Normal',
  symptoms: 'Sintomas ligeiros',
  migraine: 'Enxaqueca',
  recovery: 'Recuperação',
  missing: 'Sem registo',
};
export const locations = [
  'Frontal',
  'Temporal esquerda',
  'Temporal direita',
  'Atrás dos olhos',
  'Occipital',
  'Pescoço',
  'Difusa',
];
export const premonitory = [
  'Sonolência',
  'Fadiga',
  'Bocejos',
  'Irritabilidade',
  'Dificuldade de concentração',
  'Fome',
  'Cravings',
  'Sede',
  'Rigidez no pescoço',
  'Desconforto geral',
  'Sensibilidade à luz',
  'Sensibilidade ao som',
  'Alterações de humor',
];
export const triggerGroups: Record<string, string[]> = {
  Sono: ['Pouco sono', 'Demasiado sono', 'Sono irregular'],
  Alimentação: [
    'Saltar refeição',
    'Refeição pesada',
    'Açúcar',
    'Chocolate',
    'Queijo',
    'Processados',
    'Álcool',
  ],
  Bebidas: ['Pouca água', 'Excesso de cafeína', 'Menos cafeína'],
  Ambiente: [
    'Calor',
    'Frio',
    'Luz intensa',
    'Ecrãs',
    'Ruído',
    'Mudança meteorológica',
  ],
  Físico: ['Exercício intenso', 'Fadiga', 'Tensão cervical', 'Má postura'],
  Mental: ['Stress', 'Ansiedade', 'Trabalho intenso'],
};
