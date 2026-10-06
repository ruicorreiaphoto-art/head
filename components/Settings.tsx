'use client';
import { useEffect, useState } from 'react';
import { Data, dataSchema, Medication, uid, emptyData } from '@/lib/model';
import { Field, Check, Select } from './Fields';
import { exportJSON } from '@/lib/export';
export default function Settings({
  data,
  onSave,
  switchMode,
  onWeather,
  install,
}: {
  data: Data;
  onSave: (d: Data) => Promise<void>;
  switchMode: (mode: Data['mode']) => Promise<void>;
  onWeather: () => Promise<void>;
  install: () => void;
}) {
  const [s, setS] = useState(data.settings);
  useEffect(() => setS(data.settings), [data.settings]);
  const [med, setMed] = useState({
    name: '',
    kind: 'other' as Medication['kind'],
    dosage: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage('Alterações guardadas.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operação falhou');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONFIGURATION / YOUR DEFAULTS</div>
          <h1>
            Settings<span className="cursor">_</span>
          </h1>
          <p>Os defaults simplificam os registos; não são recomendações.</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-title">
          <span>DAILY DEFAULTS</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => onSave({ ...data, settings: s }));
          }}
        >
          <div className="form-grid">
            <Field
              label="Hora habitual de acordar"
              type="time"
              value={s.wake}
              onChange={(v) => setS({ ...s, wake: v })}
            />
            <Field
              label="Hora habitual de deitar"
              type="time"
              value={s.bed}
              onChange={(v) => setS({ ...s, bed: v })}
            />
            <Field
              label="Cafés habituais / dia"
              type="number"
              min={0}
              max={30}
              value={s.usualCoffee}
              onChange={(v) => setS({ ...s, usualCoffee: Number(v) })}
            />
            <Field
              label="Hora preferida de check-in"
              type="time"
              value={s.checkIn}
              onChange={(v) => setS({ ...s, checkIn: v })}
            />
          </div>
          <button className="primary" disabled={busy}>
            Guardar defaults
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>MEDICATION LIBRARY</span>
        </div>
        {data.medications.map((m) => (
          <div className="list-row" key={m.id}>
            <span>
              {m.name}
              <small className="muted">
                {' '}
                · {m.kind} · {m.dosage || 'dose não definida'}
              </small>
            </span>
            <button
              disabled={busy}
              onClick={() =>
                void run(() =>
                  onSave({
                    ...data,
                    medications: data.medications.filter((x) => x.id !== m.id),
                  }),
                )
              }
            >
              Remover
            </button>
          </div>
        ))}
        <p className="hint">
          Remover um medicamento da lista preserva o histórico de tomas.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await onSave({
                ...data,
                medications: [...data.medications, { ...med, id: uid() }],
              });
              setMed({ ...med, name: '', dosage: '' });
            });
          }}
        >
          <div className="form-grid">
            <Field
              label="Nome do medicamento"
              value={med.name}
              required
              onChange={(v) => setMed({ ...med, name: v })}
            />
            <Select
              label="Categoria"
              value={med.kind}
              options={[
                ['preventive', 'Preventivo'],
                ['rescue', 'Resgate'],
                ['other', 'Outro'],
              ]}
              onChange={(v) =>
                setMed({ ...med, kind: v as Medication['kind'] })
              }
            />
            <Field
              label="Dose habitual (opcional)"
              value={med.dosage}
              onChange={(v) => setMed({ ...med, dosage: v })}
            />
          </div>
          <button disabled={busy}>Adicionar medicamento</button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>WEATHER / OPTIONAL</span>
        </div>
        <p className="hint">
          Open-Meteo, sem chave de API. Apenas as coordenadas são enviadas ao
          serviço; os registos de saúde ficam no dispositivo. Pode introduzir a
          meteorologia manualmente no check-in.
        </p>
        <Check
          label="Obter meteorologia ao guardar o check-in de hoje"
          checked={s.weatherEnabled}
          onChange={(v) => setS({ ...s, weatherEnabled: v })}
        />
        <div className="form-grid">
          <Field
            label="Latitude"
            type="number"
            min={-90}
            max={90}
            step={0.0001}
            value={s.latitude ?? ''}
            onChange={(v) => setS({ ...s, latitude: v ? Number(v) : null })}
          />
          <Field
            label="Longitude"
            type="number"
            min={-180}
            max={180}
            step={0.0001}
            value={s.longitude ?? ''}
            onChange={(v) => setS({ ...s, longitude: v ? Number(v) : null })}
          />
        </div>
        <div className="inline">
          <button
            disabled={busy}
            onClick={() => void run(() => onSave({ ...data, settings: s }))}
          >
            Guardar meteorologia
          </button>
          <button
            disabled={busy || !data.settings.weatherEnabled}
            onClick={() => void run(onWeather)}
          >
            Obter agora para hoje
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>REMINDERS / OPT-IN</span>
        </div>
        <p className="hint">
          Nesta versão, lembretes locais funcionam enquanto a aplicação está
          aberta. Notificações agendadas com a app fechada exigem uma integração
          futura com o sistema operativo.
        </p>
        <Check
          label="Activar lembretes com a app aberta"
          checked={s.reminders}
          onChange={(v) => setS({ ...s, reminders: v })}
        />
        <div className="form-grid">
          <Field
            label="Check-in de manhã"
            type="time"
            value={s.morning}
            onChange={(v) => setS({ ...s, morning: v })}
          />
          <Field
            label="Check-in à noite"
            type="time"
            value={s.evening}
            onChange={(v) => setS({ ...s, evening: v })}
          />
          <Field
            label="Registar medicação"
            type="time"
            value={s.medicationReminder}
            onChange={(v) => setS({ ...s, medicationReminder: v })}
          />
        </div>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (s.reminders) {
                if (!('Notification' in window))
                  throw new Error(
                    'Notificações indisponíveis neste navegador.',
                  );
                if ((await Notification.requestPermission()) !== 'granted')
                  throw new Error('Notificações não autorizadas.');
              }
              await onSave({ ...data, settings: s });
            })
          }
        >
          Guardar lembretes
        </button>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>DATA & INSTALLATION</span>
        </div>
        <p>
          Conjunto actual:{' '}
          <b>
            {data.mode === 'demo'
              ? 'DEMO · dados fictícios'
              : 'PERSONAL · dados pessoais'}
          </b>
        </p>
        <div className="export-actions">
          <button onClick={() => exportJSON(data)}>
            Exportar backup completo
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(() =>
                switchMode(data.mode === 'demo' ? 'personal' : 'demo'),
              )
            }
          >
            {data.mode === 'demo'
              ? 'Voltar aos meus dados'
              : 'Explorar demonstração'}
          </button>
          <button onClick={install}>Instalar PWA</button>
        </div>
        <label className="field">
          <span>
            Restaurar JSON (substitui este conjunto; exporte um backup primeiro)
          </span>
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              void run(async () => {
                if (f.size > 20 * 1024 * 1024)
                  throw new Error('Backup demasiado grande (máximo 20 MB).');
                const imported = dataSchema.parse(JSON.parse(await f.text()));
                if (imported.mode !== data.mode)
                  throw new Error(
                    'Este backup pertence a outro conjunto. Mude para ' +
                      imported.mode +
                      ' antes de importar.',
                  );
                if (
                  !window.confirm(
                    'Substituir os dados actuais por este backup?',
                  )
                )
                  return;
                await onSave(imported);
              });
            }}
          />
        </label>
        <Field
          label="Para apagar este conjunto, escreva APAGAR"
          value={confirmation}
          onChange={setConfirmation}
        />
        <button
          className="danger"
          disabled={busy || confirmation !== 'APAGAR'}
          onClick={() =>
            void run(async () => {
              await onSave(emptyData(data.mode));
              setConfirmation('');
            })
          }
        >
          Apagar dados {data.mode}
        </button>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="green">
          {message}
        </p>
      )}
    </>
  );
}
