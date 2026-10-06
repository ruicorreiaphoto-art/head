'use client';
import { useState } from 'react';
import { Data, Intake, uid } from '@/lib/model';
import { Field, Select, Range, Check, TextArea } from './Fields';
import { toLocal } from './LogForm';
export default function MedicationForm({
  data,
  initial,
  onSave,
}: {
  data: Data;
  initial?: Intake;
  onSave: (i: Intake) => Promise<void>;
}) {
  const first = data.medications[0];
  const [i, setI] = useState<Intake>(
    initial ?? {
      id: uid(),
      medicationId: first?.id ?? '',
      name: first?.name ?? '',
      kind: first?.kind ?? 'other',
      at: new Date().toISOString(),
      dosage: first?.dosage ?? '',
      effectiveness: null,
      improvementMinutes: null,
      secondDose: false,
      notes: '',
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await onSave(i);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Erro ao guardar');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Select
        label="Medicamento"
        value={i.medicationId}
        options={[
          ...data.medications.map((m): [string, string] => [m.id, m.name]),
          ...(initial &&
          !data.medications.some((m) => m.id === initial.medicationId)
            ? [
                [initial.medicationId, initial.name + ' (histórico)'] as [
                  string,
                  string,
                ],
              ]
            : []),
        ]}
        onChange={(v) => {
          const m = data.medications.find((m) => m.id === v);
          if (!m) return;
          setI({
            ...i,
            medicationId: m.id,
            name: m.name,
            kind: m.kind,
            dosage: m.dosage,
          });
        }}
      />
      <div className="form-grid">
        <Field
          label="Data e hora da toma"
          required
          type="datetime-local"
          value={toLocal(i.at)}
          onChange={(v) => {
            if (v) setI({ ...i, at: new Date(v).toISOString() });
          }}
        />
        <Field
          label="Dose tomada (conforme prescrita)"
          value={i.dosage}
          onChange={(v) => setI({ ...i, dosage: v })}
        />
      </div>
      <Check
        label="Registar eficácia"
        checked={i.effectiveness !== null}
        onChange={(v) => setI({ ...i, effectiveness: v ? 5 : null })}
      />
      {i.effectiveness !== null && (
        <Range
          label="Eficácia observada"
          value={i.effectiveness}
          onChange={(v) => setI({ ...i, effectiveness: v })}
        />
      )}
      <Field
        label="Minutos até melhoria (opcional)"
        type="number"
        min={0}
        value={i.improvementMinutes ?? ''}
        onChange={(v) =>
          setI({ ...i, improvementMinutes: v === '' ? null : Number(v) })
        }
      />
      <Check
        label="Foi uma segunda dose"
        checked={i.secondDose}
        onChange={(v) => setI({ ...i, secondDose: v })}
      />
      <TextArea
        label="Notas"
        value={i.notes}
        onChange={(v) => setI({ ...i, notes: v })}
      />
      <p className="hint">
        Registo da toma apenas. A aplicação não sugere doses nem alterações de
        tratamento.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary"
        disabled={busy || (!initial && !data.medications.length)}
      >
        {busy ? 'A guardar…' : 'Guardar toma'}
      </button>
    </form>
  );
}
