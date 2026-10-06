'use client';
import {
  Activity,
  ArrowUpRight,
  Plus,
  Sun,
  Moon,
  Droplets,
  Pill,
  Clock,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Data, dayKey, stateOnDate, labels, durationHours } from '@/lib/model';
import { report, streak } from '@/lib/analytics';
import { formatDuration, elapsedClock } from '@/lib/format';
export const num = (n: number | null, digits = 1) =>
  n === null ? '—' : n.toFixed(digits);
export const duration = formatDuration;
export default function Dashboard({
  data,
  now,
  openLog,
  openAttack,
  openMeds,
  openEvent,
  navigate,
}: {
  data: Data;
  now: Date;
  openLog: (date?: string) => void;
  openAttack: () => void;
  openMeds: () => void;
  openEvent: () => void;
  navigate: (s: string) => void;
}) {
  const date = dayKey(now);
  const today = data.logs.find((l) => l.date === date);
  const active = data.attacks.find((a) => !a.end);
  const month = report(data, date.slice(0, 7) + '-01', date);
  const meds = data.intakes.filter((i) => dayKey(new Date(i.at)) === date);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 13 + i);
    return {
      date: dayKey(d),
      day: d.getDate(),
      state: stateOnDate(data, dayKey(d)),
    };
  });
  const baseEvents = data.events.filter((e) => dayKey(new Date(e.at)) === date);
  const timeline = [
    ...baseEvents,
    ...meds
      .filter(
        (i) =>
          !baseEvents.some((e) => e.type === 'medication' && e.at === i.at),
      )
      .map((i) => ({ id: i.id, at: i.at, type: 'medication', text: i.name })),
    ...data.attacks
      .filter(
        (a) =>
          dayKey(new Date(a.start)) === date &&
          !baseEvents.some((e) => e.type === 'migraine' && e.at === a.start),
      )
      .map((a) => ({
        id: a.id,
        at: a.start,
        type: 'migraine',
        text: 'Crise iniciada',
      })),
    ...(['wakeTime', 'breakfast', 'lunch', 'dinner'] as const).flatMap(
      (key, i) =>
        today?.[key]
          ? [
              {
                id: key,
                at: new Date(`${date}T${today[key]}:00`).toISOString(),
                type: key,
                text: ['Acordar', 'Pequeno-almoço', 'Almoço', 'Jantar'][i],
              },
            ]
          : [],
    ),
  ]
    .filter(
      (e, i, all) =>
        all.findIndex((x) => x.at === e.at && x.text === e.text) === i,
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PERSONAL HEALTH LOG / OVERVIEW</div>
          <h1>
            System status<span className="cursor">_</span>
          </h1>
          <p>
            {now.toLocaleDateString('pt-PT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            <span className="muted">
              ·{' '}
              {data.mode === 'demo'
                ? 'dados fictícios'
                : 'o seu registo pessoal'}
            </span>
          </p>
        </div>
        <button className="primary" onClick={() => openLog()}>
          <Plus size={16} /> Log today
        </button>
      </div>
      <div className="overview-grid">
        <section className="panel status-panel">
          <div className="panel-title">
            <span>
              <Activity size={15} /> TODAY&apos;S READOUT
            </span>
            <span
              className={`status-badge ${active ? 'migraine' : (today?.state ?? 'missing')}`}
            >
              {active
                ? 'ACTIVE'
                : today
                  ? labels[today.state].toUpperCase()
                  : 'NO DATA'}
            </span>
          </div>
          <div className="readout">
            <div>
              <span>Enxaqueca</span>
              <b className={active ? 'red' : 'green'}>
                {active
                  ? 'ACTIVE'
                  : today?.state === 'migraine'
                    ? 'REPORTED'
                    : today?.state === 'recovery'
                      ? 'RECOVERY'
                      : today
                        ? 'NONE'
                        : '—'}
              </b>
            </div>
            <div>
              <span>Dor</span>
              <b>
                {active?.intensity ?? today?.pain ?? '—'}
                <small>/10</small>
              </b>
            </div>
            <div>
              <span>Energia</span>
              <b>
                {today?.energy ?? '—'}
                <small>/10</small>
              </b>
            </div>
            <div>
              <span>Sono</span>
              <b>{duration(today?.sleepHours ?? null)}</b>
            </div>
            <div>
              <span>Stress</span>
              <b>
                {today?.stress ?? '—'}
                <small>/10</small>
              </b>
            </div>
            <div>
              <span>Medicação</span>
              <b>
                {meds.length
                  ? `${meds.length} TOMA${meds.length > 1 ? 'S' : ''}`
                  : today?.missedMedications.length
                    ? 'NÃO TOMADA: ' + today.missedMedications.join(', ')
                    : 'SEM REGISTO'}
              </b>
            </div>
          </div>
          <div className="status-foot">
            <span className="dot" />{' '}
            {today
              ? 'Check-in guardado · ' +
                new Date(today.recordedAt).toLocaleTimeString('pt-PT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'O seu dia começa com um check-in.'}
          </div>
        </section>
        <section className="panel streak-panel">
          <div className="panel-title">
            <span>
              <Zap size={15} /> CURRENT STREAK
            </span>
            <ArrowUpRight size={16} />
          </div>
          <div className="streak-number">
            {streak(data, now)}
            <span>dias</span>
          </div>
          <h3>sem enxaqueca registada</h3>
          <p>Um dia de cada vez.</p>
          <div className="streak-spark">
            {days.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${labels[d.state]}`}
                className={d.state}
              />
            ))}
          </div>
          <small>Apenas dias consecutivos com registo.</small>
        </section>
      </div>
      <div className="stats-grid">
        {[
          [
            'CRISES ESTE MÊS',
            String(month.total),
            'iniciadas no período',
            Activity,
          ],
          [
            'INTENSIDADE MÉDIA',
            num(month.avgIntensity),
            '/10 · intensidade máxima',
            Zap,
          ],
          [
            'DURAÇÃO MÉDIA',
            duration(month.avgDuration),
            'apenas crises concluídas',
            Clock,
          ],
          [
            'HIDRATAÇÃO HOJE',
            today ? num(today.water) + ' L' : '—',
            'água aproximada',
            Droplets,
          ],
        ].map(([title, value, detail, Icon]) => {
          const I = Icon as typeof Activity;
          return (
            <section className="panel stat-card" key={String(title)}>
              <div className="eyebrow">
                {String(title)}
                <I size={14} />
              </div>
              <div className="stat-value">{String(value)}</div>
              <p>{String(detail)}</p>
            </section>
          );
        })}
      </div>
      <div className="bottom-grid">
        <div>
          <section className="panel days-panel">
            <div className="panel-title">
              <span>LAST 14 DAYS</span>
              <button
                className="text-button"
                onClick={() => navigate('calendar')}
              >
                Calendário <ChevronRight size={14} />
              </button>
            </div>
            <div className="day-strip">
              {days.map((d) => (
                <button
                  key={d.date}
                  onClick={() => openLog(d.date)}
                  title={`${d.date}: ${labels[d.state]}`}
                  aria-label={`${d.date}: ${labels[d.state]}`}
                  className={`day-cell ${d.state} ${d.date === date ? 'today' : ''}`}
                >
                  <span>{String(d.day).padStart(2, '0')}</span>
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
                      )[d.state]
                    }
                  </b>
                </button>
              ))}
            </div>
            <div className="legend">
              <span>
                <b className="green">.</b> Normal
              </span>
              <span>
                <b className="amber">!</b> Sintomas
              </span>
              <span>
                <b className="red">×</b> Crise
              </span>
              <span>~ Recuperação</span>
              <span>– Sem registo</span>
            </div>
          </section>
          <section
            className={`panel attack-panel ${active ? 'active-attack' : ''}`}
          >
            <div className="inline">
              <span className="attack-icon">
                <Activity size={23} />
              </span>
              <div>
                <div className="eyebrow">MIGRAINE STATUS</div>
                <h3>{active ? 'Crise em curso' : 'Nenhuma crise activa'}</h3>
                <p>
                  {active
                    ? `${elapsedClock(durationHours(active, now))} · intensidade ${active.intensity}/10`
                    : 'Registe o início de uma crise com um toque.'}
                </p>
              </div>
            </div>
            <div className="inline">
              <button
                className={active ? 'danger' : 'secondary'}
                onClick={openAttack}
              >
                {active ? 'Actualizar / terminar' : '+ Start attack'}
              </button>
              {active && (
                <button onClick={openMeds}>
                  <Pill size={16} /> Registar toma
                </button>
              )}
            </div>
          </section>
        </div>
        <section className="panel timeline-panel">
          <div className="panel-title">
            <span>
              <Clock size={14} /> TODAY&apos;S TIMELINE
            </span>
            <span className="muted">{timeline.length} eventos</span>
          </div>
          <div className="timeline">
            {timeline.length ? (
              timeline.map((e) => (
                <div key={e.id} className="timeline-row">
                  <time>
                    {new Date(e.at).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <span
                    className={`timeline-dot ${e.type === 'migraine' ? 'red-dot' : ''}`}
                  />
                  <span>{e.text}</span>
                </div>
              ))
            ) : (
              <div className="empty">
                <Sun size={24} />
                <p>Ainda sem eventos hoje.</p>
                <small>Registe um café, uma toma ou o seu check-in.</small>
              </div>
            )}
          </div>
          <button className="text-button timeline-add" onClick={openEvent}>
            <Plus size={14} /> Adicionar evento
          </button>
        </section>
      </div>
      <div className="quiet-note">
        <Moon size={13} /> Track. Observe. Understand.{' '}
        <span>
          Os registos são pessoais. As associações não estabelecem causas.
        </span>
      </div>
    </>
  );
}
