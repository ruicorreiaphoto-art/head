import { describe, it, expect } from 'vitest';
import {
  emptyData,
  emptyLog,
  startAttack,
  endAttack,
  updateAttack,
  durationHours,
  saveLog,
  takeMedication,
  dataSchema,
  sleepDuration,
  attackOnDate,
} from '../lib/model';
import { command } from '../lib/commands';
import { report, preAnalysis, streak, searchData } from '../lib/analytics';
import { demoData } from '../lib/demo';
const at = (s: string) => new Date(s);
describe('crises', () => {
  it('inicia uma única crise e impede duplicação', () => {
    const d = startAttack(
      emptyData(),
      { intensity: 6, maxIntensity: 6 },
      at('2026-10-01T10:00:00Z'),
    );
    expect(d.attacks[0].intensity).toBe(6);
    expect(() => startAttack(d)).toThrow(/activa/);
  });
  it('calcula duração de vários dias e preserva máximo', () => {
    let d = startAttack(emptyData(), {}, at('2026-10-01T10:00:00Z'));
    d = updateAttack(d, d.attacks[0].id, { intensity: 9 });
    d = updateAttack(d, d.attacks[0].id, { intensity: 3 });
    d = endAttack(d, { residual: 'Fadiga' }, at('2026-10-03T13:30:00Z'));
    expect(durationHours(d.attacks[0])).toBe(51.5);
    expect(d.attacks[0].maxIntensity).toBe(9);
    expect(d.attacks[0].residual).toBe('Fadiga');
    expect(attackOnDate(d.attacks[0], '2026-10-02')).toBe(true);
  });
  it('rejeita fim antes do início e fim sem crise', () => {
    const d = startAttack(emptyData(), {}, at('2026-10-01T10:00:00Z'));
    expect(() => endAttack(d, {}, at('2026-10-01T09:00:00Z'))).toThrow();
    expect(() => endAttack(emptyData())).toThrow();
  });
});
describe('registos e medicação', () => {
  it('substitui o dia mas mantém observações com hora', () => {
    let d = emptyData();
    const l = emptyLog('2026-10-01');
    d = saveLog(d, l);
    d = saveLog(d, { ...l, pain: 7 });
    expect(d.logs).toHaveLength(1);
    expect(d.observations).toHaveLength(2);
    expect(d.observations[0].log.pain).toBe(0);
    expect(d.logs[0].pain).toBe(7);
    expect(() => saveLog(d, { ...l, pain: 11 })).toThrow();
  });
  it('valida datas reais e sono a atravessar meia noite', () => {
    expect(() => saveLog(emptyData(), emptyLog('2026-02-31'))).toThrow();
    expect(sleepDuration('23:30', '07:30')).toBe(8);
  });
  it('regista a toma sem propor doses', () => {
    const d = takeMedication(emptyData(), {
      id: 'i1',
      medicationId: 'zolmitriptan',
      name: 'Zolmitriptan',
      kind: 'rescue',
      at: '2026-10-01T10:20:00Z',
      dosage: 'dose prescrita',
      effectiveness: 7,
      improvementMinutes: 30,
      secondDose: false,
      notes: '',
    });
    expect(d.intakes[0].effectiveness).toBe(7);
    expect(d.events[0].type).toBe('medication');
    expect(() =>
      takeMedication(emptyData(), { ...d.intakes[0], medicationId: 'unknown' }),
    ).toThrow();
  });
});
describe('relatórios e associações', () => {
  it('calcula as médias e exclui crises activas da duração', () => {
    let d = startAttack(
      emptyData(),
      { intensity: 6, maxIntensity: 6 },
      at('2026-10-01T10:00:00Z'),
    );
    d = endAttack(d, {}, at('2026-10-01T14:00:00Z'));
    d = startAttack(
      d,
      { intensity: 8, maxIntensity: 8 },
      at('2026-10-02T10:00:00Z'),
    );
    const r = report(d, '2026-10-01', '2026-10-31');
    expect(r.total).toBe(2);
    expect(r.completed).toBe(1);
    expect(r.avgDuration).toBe(4);
    expect(r.avgIntensity).toBe(7);
    expect(r.avgSleep).toBeNull();
  });
  it('analisa apenas observações anteriores dentro da janela', () => {
    let d = emptyData();
    let l = emptyLog('2026-10-01');
    l = { ...l, recordedAt: '2026-10-01T08:00:00Z', sleepiness: 8 };
    d = saveLog(d, l);
    d = saveLog(d, { ...l, recordedAt: '2026-10-01T14:00:00Z', sleepiness: 0 });
    d = startAttack(d, {}, at('2026-10-01T10:00:00Z'));
    const r = preAnalysis(d, d.attacks, 4);
    expect(r.covered).toBe(1);
    expect(r.signals[0].percent).toBe(100);
    expect(preAnalysis(d, d.attacks, 1).covered).toBe(0);
  });
  it('dias em falta não aumentam streak', () => {
    const d = saveLog(emptyData(), emptyLog('2026-10-06'));
    expect(streak(d, at('2026-10-06T12:00:00'))).toBe(1);
  });
});
describe('parser e backups', () => {
  it('executa comandos reais, limites e navegação', () => {
    let d = command('log pain 6', emptyData()).data;
    expect(d.logs[0].pain).toBe(6);
    d = command('log water 500ml', d).data;
    d = command('log water 1l', d).data;
    expect(d.logs[0].water).toBe(1.5);
    d = command('log coffee', d).data;
    expect(d.logs[0].coffees).toHaveLength(1);
    expect(command('report 30d', d).view).toBe('reports');
    expect(command('log zolmitriptan', d).data.intakes).toHaveLength(1);
    expect(() => command('log stress 11', d)).toThrow();
    expect(() => command('rm -rf', d)).toThrow();
  });
  it('start/stop e log pain actualizam intensidade activa', () => {
    let d = command('migraine start', emptyData()).data;
    d = command('log pain 8', d).data;
    expect(d.attacks[0].intensity).toBe(8);
    d = command('migraine stop', d).data;
    expect(d.attacks[0].end).not.toBeNull();
  });
  it('demo tem 30 dias, backup válido e pesquisa contextual', () => {
    const d = demoData();
    expect(d.logs).toHaveLength(30);
    expect(d.mode).toBe('demo');
    expect(dataSchema.parse(JSON.parse(JSON.stringify(d))).logs).toHaveLength(
      30,
    );
    expect(searchData(d, 'zolmitriptan').length).toBe(5);
    expect(searchData(d, 'sleep less than 7h').length).toBeGreaterThan(0);
    expect(emptyData().logs).toHaveLength(0);
  });
  it('recusa backups com IDs duplicados', () => {
    const d = demoData();
    expect(() =>
      dataSchema.parse({ ...d, logs: [...d.logs, d.logs[0]] }),
    ).toThrow();
  });
});

describe('regressões de observações e duração', () => {
  it('mantém observações antigas de backups/demo ao criar um novo snapshot', () => {
    let d = emptyData();
    d.logs.push({
      ...emptyLog('2026-10-01'),
      recordedAt: '2026-10-01T08:00:00Z',
      sleepiness: 8,
    });
    d = saveLog(d, {
      ...emptyLog('2026-10-02'),
      recordedAt: '2026-10-02T08:00:00Z',
    });
    d = startAttack(d, {}, at('2026-10-01T10:00:00Z'));
    expect(preAnalysis(d, d.attacks, 4).signals[0].percent).toBe(100);
  });
  it('preserva a hora explícita de um sinal introduzido retrospectivamente', () => {
    let d = emptyData();
    d = saveLog(d, {
      ...emptyLog('2026-10-01'),
      recordedAt: '2026-10-01T12:00:00Z',
      incoming: true,
      incomingAt: '2026-10-01T08:00:00Z',
      sleepiness: 8,
    });
    d = startAttack(d, {}, at('2026-10-01T10:00:00Z'));
    expect(preAnalysis(d, d.attacks, 4).covered).toBe(1);
  });
});
