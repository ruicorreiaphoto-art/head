'use client';
import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Data, dayKey } from '@/lib/model';
import { report } from '@/lib/analytics';
import { exportJSON, exportCSV, exportPDF } from '@/lib/export';
import { Field } from './Fields';
import { num, duration } from './Dashboard';
export default function Reports({
  data,
  initialDays = 30,
}: {
  data: Data;
  initialDays?: number;
}) {
  const [days, setDays] = useState(initialDays);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - initialDays + 1);
    return dayKey(d);
  });
  const [to, setTo] = useState(dayKey());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setDays(initialDays);
    const d = new Date();
    d.setDate(d.getDate() - initialDays + 1);
    setFrom(dayKey(d));
    setTo(dayKey());
  }, [initialDays]);
  const r = report(data, from, to);
  const valid = !!from && !!to && from <= to;
  async function pdf() {
    setBusy(true);
    try {
      await exportPDF(data, from, to);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar PDF');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EXPORT / BRING TO YOUR APPOINTMENT</div>
          <h1>
            Reports<span className="cursor">_</span>
          </h1>
          <p>Um resumo claro para conversar com o seu médico.</p>
        </div>
        <FileText className="green" size={28} />
      </div>
      <section className="panel">
        <div className="panel-title">
          <span>REPORT PERIOD</span>
          <div className="segmented">
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                className={days === n ? 'selected' : ''}
                onClick={() => {
                  setDays(n);
                  const d = new Date();
                  d.setDate(d.getDate() - n + 1);
                  setFrom(dayKey(d));
                  setTo(dayKey());
                }}
              >
                {n}d
              </button>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <Field
            label="Desde"
            type="date"
            value={from}
            onChange={(v) => {
              setFrom(v);
              setDays(0);
            }}
          />
          <Field
            label="Até"
            type="date"
            value={to}
            onChange={(v) => {
              setTo(v);
              setDays(0);
            }}
          />
        </div>
        {!valid && <p className="error">Seleccione um período válido.</p>}
        <div className="export-actions">
          <button
            className="primary"
            disabled={busy || !valid}
            onClick={() => void pdf()}
          >
            <Download size={15} />
            {busy ? 'A gerar…' : 'Generate report · PDF'}
          </button>
          <button disabled={!valid} onClick={() => exportCSV(data, from, to)}>
            CSV
          </button>
          <button
            disabled={!valid}
            onClick={() => {
              const filtered = {
                ...data,
                logs: r.logs,
                attacks: r.attacks,
                intakes: r.intakes,
                observations: data.observations.filter(
                  (o) =>
                    dayKey(new Date(o.at)) >= from &&
                    dayKey(new Date(o.at)) <= to,
                ),
                events: data.events.filter(
                  (e) =>
                    dayKey(new Date(e.at)) >= from &&
                    dayKey(new Date(e.at)) <= to,
                ),
              };
              exportJSON(filtered);
            }}
          >
            JSON · período
          </button>
          <button onClick={() => exportJSON(data)}>
            Backup completo · JSON
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      <section className="panel report-preview">
        <div className="panel-title">
          <span>
            REPORT PREVIEW {data.mode === 'demo' ? ' / DADOS FICTÍCIOS' : ''}
          </span>
          <span className="muted">
            {from} → {to}
          </span>
        </div>
        <div className="readout">
          <div>
            <span>Crises iniciadas</span>
            <b>{r.total}</b>
          </div>
          <div>
            <span>Crises concluídas</span>
            <b>{r.completed}</b>
          </div>
          <div>
            <span>Duração média</span>
            <b>{duration(r.avgDuration)}</b>
          </div>
          <div>
            <span>Intensidade máxima média</span>
            <b>{num(r.avgIntensity)}/10</b>
          </div>
          <div>
            <span>Sono médio</span>
            <b>{num(r.avgSleep)}h</b>
          </div>
          <div>
            <span>Stress médio</span>
            <b>{num(r.avgStress)}/10</b>
          </div>
          <div>
            <span>Eficácia registada</span>
            <b>{num(r.effectiveness)}/10</b>
          </div>
          <div>
            <span>Dias com check-in</span>
            <b>{r.logs.length}</b>
          </div>
        </div>
        {[
          ['Medicação · tomas', r.medications],
          ['Sintomas registados', r.symptoms],
          ['Possíveis triggers', r.triggers],
        ].map(([title, values]) => (
          <div key={title as string}>
            <h3>{title as string}</h3>
            {(values as [string, number][]).length ? (
              (values as [string, number][]).map(([s, n]) => (
                <div className="list-row" key={s}>
                  <span>{s}</span>
                  <b>{n}</b>
                </div>
              ))
            ) : (
              <p className="hint">Sem dados.</p>
            )}
          </div>
        ))}
        <h3>Observações</h3>
        {r.observations.length ? (
          r.observations.map((s) => (
            <p key={s} className="note-text">
              {s}
            </p>
          ))
        ) : (
          <p className="hint">Sem observações.</p>
        )}
        <p className="hint">
          As crises são contabilizadas pela data local de início. A duração
          inclui toda a crise e só é calculada para crises concluídas. Os dados
          não constituem diagnóstico ou recomendação de tratamento.
        </p>
      </section>
    </>
  );
}
