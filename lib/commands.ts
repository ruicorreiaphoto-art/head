import {
  Data,
  dayKey,
  emptyLog,
  saveLog,
  event,
  startAttack,
  endAttack,
  takeMedication,
  uid,
  updateAttack,
} from './model';
export type CommandResult = {
  data: Data;
  message: string;
  view?: string;
  action?: string;
};
export function command(
  input: string,
  data: Data,
  now = new Date(),
): CommandResult {
  const raw = input.trim().toLowerCase().replace(/^>\s*/, '');
  const words = raw.split(/\s+/);
  const [verb, object, arg] = words;
  const result = (
    d: Data,
    message: string,
    view?: string,
    action?: string,
  ) => ({ data: d, message, view, action });
  if (['status', 'today', 'week', 'history', 'symptoms', 'meds'].includes(raw))
    return result(
      data,
      raw === 'status'
        ? data.attacks.some((a) => !a.end)
          ? 'MIGRAINE ACTIVE'
          : 'Nenhuma crise activa'
        : 'Vista aberta',
      (
        {
          status: 'dashboard',
          today: 'dashboard',
          week: 'analytics',
          history: 'calendar',
          symptoms: 'analytics',
          meds: 'medications',
        } as Record<string, string>
      )[raw],
    );
  if (verb === 'report' && (!object || /^\d+d$/.test(object)))
    return result(data, 'Relatório aberto', 'reports', object ?? '30d');
  if (raw === 'migraine start' || raw === 'log migraine')
    return result(startAttack(data, {}, now), 'Crise iniciada');
  if (raw === 'migraine stop')
    return result(endAttack(data, {}, now), 'Crise terminada');
  if (verb === 'log') {
    let log =
      data.logs.find((l) => l.date === dayKey(now)) ??
      emptyLog(dayKey(now), data.settings);
    log = { ...log, recordedAt: now.toISOString() };
    if (['pain', 'stress'].includes(object)) {
      if (
        words.length !== 3 ||
        !arg ||
        !/^\d+(\.\d+)?$/.test(arg) ||
        Number(arg) > 10
      )
        throw new Error('Utilize um valor entre 0 e 10.');
      log = { ...log, [object]: Number(arg) };
      const active = data.attacks.find((a) => !a.end);
      const updated =
        object === 'pain' && active
          ? updateAttack(data, active.id, { intensity: Number(arg) })
          : data;
      return result(
        event(
          saveLog(updated, log),
          object,
          `${object}: ${arg}/10`,
          now.toISOString(),
        ),
        `${object} guardado: ${arg}/10`,
      );
    }
    if (object === 'coffee' && words.length === 2) {
      const t = now.toTimeString().slice(0, 5);
      log.coffees = [...log.coffees, t];
      return result(
        event(saveLog(data, log), 'coffee', 'Café', now.toISOString()),
        'Café registado',
      );
    }
    if (object === 'water') {
      const match = /^(\d+(?:\.\d+)?)(ml|l)$/.exec(arg ?? '');
      if (!match || words.length !== 3)
        throw new Error('Exemplo: log water 500ml');
      const litres = Number(match[1]) / (match[2] === 'ml' ? 1000 : 1);
      log.water += litres;
      return result(
        event(
          saveLog(data, log),
          'water',
          `Água +${litres} L`,
          now.toISOString(),
        ),
        'Água registada',
      );
    }
    const medication = data.medications.find(
      (m) => m.name.toLowerCase() === words.slice(1).join(' '),
    );
    if (medication)
      return result(
        takeMedication(data, {
          id: uid(),
          medicationId: medication.id,
          name: medication.name,
          kind: medication.kind,
          at: now.toISOString(),
          dosage: medication.dosage,
          effectiveness: null,
          improvementMinutes: null,
          secondDose: false,
          notes: '',
        }),
        'Toma registada; pode completar os detalhes em Medicação',
      );
  }
  throw new Error(
    'Comando desconhecido. Experimente: log pain 6, log coffee, log water 500ml, migraine start, report 30d.',
  );
}
