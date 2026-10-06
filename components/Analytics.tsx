'use client';
import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Data, DailyLog, dayKey } from '@/lib/model';
import {
  report,
  association,
  preAnalysis,
  incomingFollowed,
} from '@/lib/analytics';
import { num, duration } from './Dashboard';
export default function Analytics({ data }: { data: Data }) {
  const [period, setPeriod] = useState(30);
  const [window, setWindow] = useState(24);
  const to = dayKey();
  const start = new Date();
  start.setDate(start.getDate() - period + 1);
  const r = report(data, dayKey(start), to);
  const pre = preAnalysis(data, r.attacks, window);
  const incoming = incomingFollowed(data);
  const metrics: [string, (l: DailyLog) => number | boolean | null, string][] =
    [
      ['Sono', (l) => l.sleepHours, 'h'],
      ['Stress', (l) => l.stress, '/10'],
      ['Refeição tardia', (l) => l.lateMeal, '%'],
      ['Hidratação', (l) => l.water, 'L'],
      ['Cafeína', (l) => l.coffees.length, 'cafés'],
      ['Cafeína após 15h', (l) => l.coffees.some((t) => t >= '15:00'), '%'],
      ['Ecrãs', (l) => l.screenHours, 'h'],
      ['Temperatura', (l) => l.weather?.temperature ?? null, '°C'],
      ['Pressão', (l) => l.weather?.pressure ?? null, 'hPa'],
      ['Humidade', (l) => l.weather?.humidity ?? null, '% RH'],
      ['Chuva', (l) => l.weather?.rain ?? null, 'mm'],
      [
        'Variação de pressão 24h',
        (l) => l.weather?.pressureChange ?? null,
        'hPa',
      ],
    ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OBSERVE / POSSIBLE ASSOCIATIONS</div>
          <h1>
            Analytics<span className="cursor">_</span>
          </h1>
          <p>Padrões dos seus registos, sem inferir causas.</p>
        </div>
        <div className="segmented">
          {[7, 30, 90, 365].map((n) => (
            <button
              key={n}
              className={n === period ? 'selected' : ''}
              onClick={() => setPeriod(n)}
            >
              {n === 365 ? 'Ano' : n + 'd'}
            </button>
          ))}
        </div>
      </div>
      <div className="stats-grid">
        {[
          ['Crises', r.total],
          ['Duração média', duration(r.avgDuration)],
          ['Intensidade média', num(r.avgIntensity) + '/10'],
          ['Eficácia registada', num(r.effectiveness) + '/10'],
        ].map(([k, v]) => (
          <div className="panel stat-card" key={k}>
            <div className="eyebrow">{k}</div>
            <div className="stat-value">{v}</div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-title">
          <span>INTENSITY / DAILY LOGS</span>
          <span className="muted">{r.logs.length} dias registados</span>
        </div>
        {r.logs.length ? (
          <>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[...r.logs].sort((a, b) =>
                    a.date.localeCompare(b.date),
                  )}
                >
                  <defs>
                    <linearGradient
                      id="painGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#7aefad" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7aefad" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#202923" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(s) => s.slice(5)}
                    stroke="#6e8175"
                    tick={{ fontSize: 10 }}
                    minTickGap={35}
                  />
                  <YAxis
                    domain={[0, 10]}
                    stroke="#6e8175"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111913',
                      border: '1px solid #35463a',
                      color: '#e5eee7',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pain"
                    name="Dor /10"
                    stroke="#7aefad"
                    fill="url(#painGradient)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="hint">
              Linha entre os dias registados; os dias em falta não representam
              dor zero.
            </p>
          </>
        ) : (
          <div className="empty">
            Registe alguns dias para começar a observar padrões.
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>PRE-MIGRAINE ANALYSIS</span>
          <div className="segmented">
            {[2, 4, 8, 12, 24].map((h) => (
              <button
                key={h}
                className={window === h ? 'selected' : ''}
                onClick={() => setWindow(h)}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
        <p className="hint">
          {pre.covered} de {pre.total} crises têm observações nas {window}h
          anteriores. A hora de observação é a do check-in ou do sinal marcado;
          não é inferida a partir da data.
        </p>
        <div className="association-bars">
          {pre.signals.map((s) => (
            <div key={s.label}>
              <span>{s.label}</span>
              <div className="bar-track">
                <div style={{ width: `${s.percent ?? 0}%` }} />
              </div>
              <b>{s.percent === null ? '—' : Math.round(s.percent) + '%'}</b>
            </div>
          ))}
        </div>
        <p className="hint">
          Possível associação · Percentagem das crises com dados na janela.
          Sinais marcados seguidos por crise em 24h: {incoming.followed}/
          {incoming.total} (todos os registos).
        </p>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>POSSIBLE ASSOCIATIONS / COMPARISON</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Dias com crise</th>
                <th>Dias sem crise</th>
                <th>Amostra com / sem</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(([label, get, unit]) => {
                const a = association(data, r.logs, get);
                const format = (v: number | null) =>
                  v === null
                    ? '—'
                    : num(unit === '%' ? v * 100 : v) + ' ' + unit;
                return (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{format(a.withMigraine)}</td>
                    <td>{format(a.withoutMigraine)}</td>
                    <td>
                      {a.nWith} / {a.nWithout}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Médias de dias com registo, agrupados pela presença de crise ou estado
          diário «Enxaqueca». Estas comparações não ajustam outros factores e
          não demonstram causalidade.
        </p>
      </section>
      <div className="two-columns">
        {[
          ['Sintomas frequentes', r.symptoms],
          ['Possíveis triggers', r.triggers],
          ['Horários de início', r.startHours],
          ['Dias de início', r.weekdays],
          ['Medicação · tomas', r.medications],
        ].map(([title, items]) => (
          <section className="panel" key={title as string}>
            <div className="panel-title">
              <span>{title as string}</span>
            </div>
            {(items as [string, number][]).length ? (
              (items as [string, number][]).map(([name, count]) => (
                <div className="list-row" key={name}>
                  <span>{name}</span>
                  <b>{count}</b>
                </div>
              ))
            ) : (
              <p className="empty">Sem dados neste período.</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
