'use client';
import { useState } from 'react';
import { Attack, locations, premonitory, triggerGroups } from '@/lib/model';
import { Field, Range, Multi, TextArea } from './Fields';
import { toLocal } from './LogForm';
export default function AttackForm({
  attack,
  onSave,
  onEnd,
}: {
  attack?: Attack;
  onSave: (fields: Partial<Attack>) => Promise<void>;
  onEnd?: (fields: Partial<Attack>) => Promise<void>;
}) {
  const [a, setA] = useState<Partial<Attack>>(
    attack ?? {
      start: new Date().toISOString(),
      intensity: 5,
      maxIntensity: 5,
      symptoms: [],
      locations: [],
      triggers: [],
      notes: '',
      effectiveness: null,
      residual: '',
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(end = false) {
    setBusy(true);
    setError('');
    try {
      await (end && onEnd ? onEnd : onSave)({
        ...a,
        maxIntensity: Math.max(a.maxIntensity ?? 0, a.intensity ?? 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field
        label="Início da crise"
        type="datetime-local"
        required
        value={toLocal(a.start!)}
        onChange={(v) => {
          if (v) setA({ ...a, start: new Date(v).toISOString() });
        }}
      />
      <Range
        label="Intensidade actual"
        value={a.intensity ?? 5}
        onChange={(v) => setA({ ...a, intensity: v })}
      />
      <Range
        label="Intensidade máxima"
        value={a.maxIntensity ?? 5}
        onChange={(v) => setA({ ...a, maxIntensity: v })}
      />
      <Multi
        label="Sintomas"
        options={[
          'Náusea',
          'Aura',
          'Sensibilidade à luz',
          'Sensibilidade ao som',
          ...premonitory,
        ]}
        value={a.symptoms ?? []}
        onChange={(v) => setA({ ...a, symptoms: v })}
      />
      <Multi
        label="Localização"
        options={locations}
        value={a.locations ?? []}
        onChange={(v) => setA({ ...a, locations: v })}
      />
      <Multi
        label="Possíveis triggers"
        options={Object.values(triggerGroups).flat()}
        value={a.triggers ?? []}
        onChange={(v) => setA({ ...a, triggers: v })}
      />
      <TextArea
        label="Contexto / medicação tomada"
        value={a.notes ?? ''}
        onChange={(v) => setA({ ...a, notes: v })}
      />
      {attack && (
        <>
          <Range
            label="Eficácia da medicação (se conhecida)"
            value={a.effectiveness ?? 0}
            onChange={(v) => setA({ ...a, effectiveness: v })}
          />
          <TextArea
            label="Sintomas residuais"
            value={a.residual ?? ''}
            onChange={(v) => setA({ ...a, residual: v })}
          />
          <Field
            label={attack.end ? 'Fim da crise' : 'Fim da crise (vazio = agora)'}
            required={!!attack.end}
            type="datetime-local"
            value={a.end ? toLocal(a.end) : ''}
            onChange={(v) =>
              setA({ ...a, end: v ? new Date(v).toISOString() : null })
            }
          />
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-footer">
        {attack && !attack.end && (
          <button
            type="button"
            disabled={busy}
            className="danger"
            onClick={() => void submit(true)}
          >
            Terminar crise
          </button>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? 'A guardar…'
            : attack
              ? 'Guardar actualização'
              : 'Iniciar crise'}
        </button>
      </div>
    </form>
  );
}
