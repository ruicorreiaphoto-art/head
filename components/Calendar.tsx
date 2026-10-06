'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Data, dayKey, stateOnDate, labels, attackOnDate } from '@/lib/model';
export default function Calendar({
  data,
  openLog,
}: {
  data: Data;
  openLog: (s: string) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [year, setYear] = useState(new Date().getFullYear());
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const offset = (month.getDay() + 6) % 7;
  const first = new Date(year, 0, 1);
  const cells = Array.from(
    {
      length: Math.ceil(
        (new Date(year + 1, 0, 1).getTime() - first.getTime()) / 86400000,
      ),
    },
    (_, i) => {
      const d = new Date(year, 0, i + 1);
      return dayKey(d);
    },
  );
  const shift = (n: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HISTORY / DAY BY DAY</div>
          <h1>
            Calendar<span className="cursor">_</span>
          </h1>
          <p>Seleccione um dia para consultar ou completar o registo.</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-title">
          <button aria-label="Mês anterior" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </button>
          <h3>
            {month.toLocaleDateString('pt-PT', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <button aria-label="Mês seguinte" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="calendar-grid">
          {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={'blank' + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = dayKey(
              new Date(month.getFullYear(), month.getMonth(), i + 1),
            );
            const state = stateOnDate(data, date);
            const log = data.logs.find((l) => l.date === date);
            return (
              <button
                key={date}
                className={`calendar-day ${state} ${date === dayKey() ? 'today' : ''}`}
                onClick={() => openLog(date)}
                aria-label={`${date}: ${labels[state]}`}
              >
                <span>{i + 1}</span>
                <b>
                  {
                    (
                      {
                        normal: '.',
                        symptoms: '!',
                        migraine: '×',
                        recovery: '~',
                        missing: '–',
                      } as Record<string, string>
                    )[state]
                  }
                </b>
                <small>{log ? log.pain + '/10' : labels[state]}</small>
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span className="green">. Normal</span>
          <span className="amber">! Sintomas</span>
          <span className="red">× Crise</span>
          <span>~ Recuperação</span>
          <span>– Sem registo</span>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>YEAR HEATMAP / PAIN INTENSITY</span>
          <div className="inline">
            <button aria-label="Ano anterior" onClick={() => setYear(year - 1)}>
              <ChevronLeft size={14} />
            </button>
            {year}
            <button aria-label="Ano seguinte" onClick={() => setYear(year + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="heatmap-scroll">
          <div
            className="heatmap"
            style={{ gridTemplateRows: 'repeat(7, 13px)' }}
          >
            {Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => (
              <span key={'pad' + i} />
            ))}
            {cells.map((date) => {
              const log = data.logs.find((l) => l.date === date);
              const attacks = data.attacks.filter((a) => attackOnDate(a, date));
              const intensity = Math.max(
                log?.pain ?? 0,
                ...attacks.map((a) => a.maxIntensity),
              );
              const state = stateOnDate(data, date);
              return (
                <button
                  className={`heat-cell ${state}`}
                  style={{
                    opacity:
                      state === 'missing' ? 1 : 0.35 + (intensity / 10) * 0.65,
                  }}
                  key={date}
                  title={`${date} · ${labels[state]} · ${log || attacks.length ? intensity + '/10' : 'sem dados'}`}
                  aria-label={`${date}: ${labels[state]}, ${intensity}/10`}
                  onClick={() => openLog(date)}
                />
              );
            })}
          </div>
        </div>
        <p className="hint">
          Cada quadrado = um dia · intensidade 0–10 · cinzento = sem dados.
          Seleccione para consultar.
        </p>
      </section>
    </>
  );
}
