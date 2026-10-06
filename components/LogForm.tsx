'use client';
import { useState } from 'react';
import {
  DailyLog,
  Data,
  logSchema,
  locations,
  premonitory,
  triggerGroups,
  sleepDuration,
} from '@/lib/model';
import {
  Field,
  Range,
  Select,
  Check,
  Multi,
  TextArea,
  Section,
} from './Fields';
export default function LogForm({
  initial,
  medications,
  onSave,
  onCancel,
}: {
  initial: DailyLog;
  settings: Data['settings'];
  medications: Data['medications'];
  onSave: (log: DailyLog) => Promise<void>;
  onCancel: () => void;
}) {
  const [log, setLog] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof DailyLog>(k: K, v: DailyLog[K]) =>
    setLog((l) => ({ ...l, [k]: v }));
  const timeSleep = (k: 'bedtime' | 'wakeTime', value: string) =>
    setLog((l) => {
      const next = { ...l, [k]: value };
      return {
        ...next,
        sleepHours: sleepDuration(next.bedtime, next.wakeTime),
      };
    });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(
        logSchema.parse({
          ...log,
          recordedAt: new Date().toISOString(),
          incomingAt: log.incoming
            ? (log.incomingAt ?? new Date().toISOString())
            : null,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="log-form">
      <div className="form-grid">
        <Field
          label="Data"
          type="date"
          value={log.date}
          onChange={(v) => set('date', v)}
          required
        />
        <Select
          label="Estado geral"
          value={log.state}
          onChange={(v) => set('state', v as DailyLog['state'])}
          options={[
            ['normal', 'Normal'],
            ['symptoms', 'Sintomas ligeiros'],
            ['migraine', 'Enxaqueca'],
            ['recovery', 'Recuperação'],
          ]}
        />
        <Range label="Dor" value={log.pain} onChange={(v) => set('pain', v)} />
        <Range
          label="Energia"
          value={log.energy}
          onChange={(v) => set('energy', v)}
        />
        <Range
          label="Stress"
          value={log.stress}
          onChange={(v) => set('stress', v)}
        />
        <Field
          label="Água · litros"
          type="number"
          min={0}
          max={20}
          step={0.1}
          value={log.water}
          onChange={(v) => set('water', Number(v))}
        />
        <Field
          label="Sono · horas"
          type="number"
          min={0}
          max={24}
          step={0.1}
          value={log.sleepHours}
          onChange={(v) => set('sleepHours', Number(v))}
        />
      </div>
      <Section title="01 / Sintomas e sinais premonitórios">
        <div className="form-grid">
          {(['sleepiness', 'nausea', 'light', 'sound', 'neck'] as const).map(
            (key, i) => (
              <Range
                key={key}
                label={
                  [
                    'Sonolência',
                    'Náusea',
                    'Sensibilidade à luz',
                    'Sensibilidade ao som',
                    'Tensão cervical',
                  ][i]
                }
                value={log[key]}
                onChange={(v) => set(key, v)}
              />
            ),
          )}
          <Select
            label="Tipo de dor"
            value={log.painType}
            onChange={(v) => set('painType', v)}
            options={['', 'Pulsátil', 'Pressão', 'Pontada', 'Aperto', 'Outro']}
          />
          <Select
            label="Humor"
            value={log.mood}
            onChange={(v) => set('mood', v)}
            options={['normal', 'Bom', 'Irritável', 'Ansioso', 'Em baixo']}
          />
        </div>
        <Multi
          label="Localização"
          options={locations}
          value={log.locations}
          onChange={(v) => set('locations', v)}
        />
        <Multi
          label="Sintomas visuais (vazio = nenhum)"
          options={[
            'Aura',
            'Visão turva',
            'Luzes intermitentes',
            'Pontos visuais',
            'Outro',
          ]}
          value={log.visual}
          onChange={(v) => set('visual', v)}
        />
        <Multi
          label="Cognição (vazio = normal)"
          options={[
            'Dificuldade de concentração',
            'Brain fog',
            'Dificuldade em falar/encontrar palavras',
          ]}
          value={log.cognitive}
          onChange={(v) => set('cognitive', v)}
        />
        <Multi
          label="Sinais premonitórios"
          options={premonitory}
          value={log.premonitory}
          onChange={(v) => set('premonitory', v)}
        />
        <Check
          label="Possível enxaqueca a aproximar-se"
          checked={log.incoming}
          onChange={(v) =>
            setLog((l) => ({
              ...l,
              incoming: v,
              incomingAt: v ? (l.incomingAt ?? new Date().toISOString()) : null,
            }))
          }
        />
        {log.incoming && (
          <Field
            label="Hora do sinal"
            type="datetime-local"
            value={toLocal(log.incomingAt ?? new Date().toISOString())}
            onChange={(v) => {
              if (v) set('incomingAt', new Date(v).toISOString());
            }}
          />
        )}
      </Section>
      <Section title="Medicação / não tomada">
        <p className="hint">
          As tomas são registadas na área Medication ou pela acção MEDS. Aqui
          pode confirmar explicitamente medicamentos que não tomou neste dia.
        </p>
        <Multi
          label="Não tomei"
          options={medications.map((m) => m.name)}
          value={log.missedMedications}
          onChange={(v) => set('missedMedications', v)}
        />
      </Section>
      <Section title="02 / Sono">
        <div className="form-grid">
          <Field
            label="Deitar"
            type="time"
            value={log.bedtime}
            onChange={(v) => timeSleep('bedtime', v)}
          />
          <Field
            label="Acordar"
            type="time"
            value={log.wakeTime}
            onChange={(v) => timeSleep('wakeTime', v)}
          />
          <Range
            label="Qualidade do sono"
            value={log.sleepQuality}
            onChange={(v) => set('sleepQuality', v)}
          />
        </div>
        <p className="hint">
          A duração é calculada ao alterar as horas. Pode ajustá-la manualmente
          acima.
        </p>
        <Check
          label="Acordei durante a noite"
          checked={log.wokeNight}
          onChange={(v) => set('wokeNight', v)}
        />
        <Check
          label="Dificuldade em adormecer"
          checked={log.difficultySleeping}
          onChange={(v) => set('difficultySleeping', v)}
        />
      </Section>
      <Section title="03 / Possíveis triggers">
        {Object.entries(triggerGroups).map(([category, options]) => (
          <Multi
            key={category}
            label={category}
            options={options}
            value={log.triggers}
            onChange={(v) => set('triggers', v)}
          />
        ))}
        <TextArea
          label="Outros / contexto"
          value={log.triggerNotes}
          onChange={(v) => set('triggerNotes', v)}
        />
      </Section>
      <Section title="04 / Alimentação e cafeína">
        <div className="form-grid">
          {(['breakfast', 'lunch', 'dinner'] as const).map((k, i) => (
            <Field
              key={k}
              label={['Pequeno-almoço', 'Almoço', 'Jantar'][i]}
              type="time"
              value={log[k]}
              onChange={(v) => set(k, v)}
            />
          ))}
          <Field
            label="Snacks"
            value={log.snacks}
            onChange={(v) => set('snacks', v)}
          />
        </div>
        <Check
          label="Saltei uma refeição"
          checked={log.skippedMeal}
          onChange={(v) => set('skippedMeal', v)}
        />
        <Check
          label="Refeição mais tarde que o habitual"
          checked={log.lateMeal}
          onChange={(v) => set('lateMeal', v)}
        />
        <Check
          label="Refeição invulgarmente pesada"
          checked={log.heavyMeal}
          onChange={(v) => set('heavyMeal', v)}
        />
        <TextArea
          label="Notas de alimentação"
          value={log.foodNotes}
          onChange={(v) => set('foodNotes', v)}
        />
        <div className="inline">
          <strong>Cafés · {log.coffees.length}</strong>
          <button
            type="button"
            onClick={() =>
              set('coffees', [
                ...log.coffees,
                new Date().toTimeString().slice(0, 5),
              ])
            }
          >
            + Café agora
          </button>
        </div>
        {log.coffees.map((t, i) => (
          <div className="inline" key={i}>
            <Field
              label={`Café ${i + 1}`}
              type="time"
              value={t}
              onChange={(v) =>
                set(
                  'coffees',
                  log.coffees.map((x, j) => (i === j ? v : x)),
                )
              }
            />
            <button
              type="button"
              aria-label={`Remover café ${i + 1}`}
              onClick={() =>
                set(
                  'coffees',
                  log.coffees.filter((_, j) => j !== i),
                )
              }
            >
              Remover
            </button>
          </div>
        ))}
      </Section>
      <Section title="05 / Movimento e ecrãs">
        <div className="form-grid">
          <Select
            label="Exercício"
            value={log.exercise}
            onChange={(v) => set('exercise', v)}
            options={[
              ['none', 'Nenhum'],
              ['walk', 'Caminhada'],
              ['gym', 'Ginásio'],
              ['running', 'Corrida'],
              ['cycling', 'Bicicleta'],
              ['skate', 'Skate'],
              ['other', 'Outro'],
            ]}
          />
          <Field
            label="Duração · minutos"
            type="number"
            min={0}
            max={1440}
            value={log.exerciseMinutes}
            onChange={(v) => set('exerciseMinutes', Number(v))}
          />
          <Select
            label="Intensidade"
            value={log.exerciseIntensity}
            onChange={(v) => set('exerciseIntensity', v)}
            options={[
              ['easy', 'Leve'],
              ['moderate', 'Moderada'],
              ['hard', 'Intensa'],
            ]}
          />
          <Select
            label="Tempo de ecrã"
            value={log.screenLevel}
            onChange={(v) => set('screenLevel', v)}
            options={['normal', 'Elevado', 'Muito elevado']}
          />
          <Field
            label="Ecrãs · horas"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={log.screenHours}
            onChange={(v) => set('screenHours', Number(v))}
          />
        </div>
      </Section>
      <Section title="06 / Meteorologia manual">
        <p className="hint">
          Opcional. Pode obter automaticamente nas definições ou introduzir os
          valores conhecidos.
        </p>
        <div className="form-grid">
          {(['temperature', 'pressure', 'humidity', 'rain'] as const).map(
            (k, i) => (
              <Field
                key={k}
                label={
                  ['Temperatura °C', 'Pressão hPa', 'Humidade %', 'Chuva mm'][i]
                }
                type="number"
                step={0.1}
                value={log.weather?.[k] ?? ''}
                onChange={(v) =>
                  set('weather', {
                    temperature: 0,
                    pressure: 0,
                    humidity: 0,
                    rain: 0,
                    pressureChange: null,
                    source: 'manual',
                    ...log.weather,
                    [k]: Number(v),
                  })
                }
              />
            ),
          )}
        </div>
        <button type="button" onClick={() => set('weather', null)}>
          Limpar meteorologia
        </button>
      </Section>
      <TextArea
        label="> notes:"
        value={log.notes}
        onChange={(v) => set('notes', v)}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary" disabled={busy} type="submit">
          {busy ? 'A guardar…' : 'Guardar registo'}
        </button>
      </div>
    </form>
  );
}
export function toLocal(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
