'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  LayoutDashboard,
  ChartNoAxesCombined,
  CalendarDays,
  FileText,
  Settings as SettingsIcon,
  Shield,
  Terminal,
  Search,
  Command,
  Plus,
  Pill,
  ArrowUpRight,
  X,
  WifiOff,
  ChevronRight,
  Database,
  Check,
  Menu,
} from 'lucide-react';
import {
  Data,
  DailyLog,
  Intake,
  Attack,
  dayKey,
  emptyLog,
  emptyData,
  saveLog,
  startAttack,
  updateAttack,
  endAttack,
  takeMedication,
  uid,
  attackOnDate,
  labels,
  event,
} from '@/lib/model';
import { loadData, persistData } from '@/lib/storage';
import { demoData } from '@/lib/demo';
import { command } from '@/lib/commands';
import { searchData } from '@/lib/analytics';
import { fetchWeather } from '@/lib/weather';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import Calendar from './Calendar';
import Reports from './Reports';
import Settings from './Settings';
import LogForm from './LogForm';
import AttackForm from './AttackForm';
import MedicationForm from './MedicationForm';
import { Field, Select, TextArea } from './Fields';
import { toLocal } from './LogForm';
type View =
  | 'dashboard'
  | 'analytics'
  | 'calendar'
  | 'reports'
  | 'medications'
  | 'settings'
  | 'privacy';
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const nav = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['analytics', 'Analytics', ChartNoAxesCombined],
  ['calendar', 'Calendar', CalendarDays],
  ['medications', 'Medication', Pill],
  ['reports', 'Reports', FileText],
] as const;
function Modal({
  title,
  children,
  onClose,
  dismissable = true,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) close.current();
      if (e.key === 'Tab') {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select, textarea, summary, [tabindex="0"]',
          ) ?? [],
        ).filter((e) => e.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handler);
      old?.focus();
    };
  }, [dismissable]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissable) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <h2>
            <span className="green">&gt;</span> {title}
          </h2>
          {dismissable && (
            <button aria-label="Fechar" onClick={onClose}>
              <X size={19} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
export default function TerminalApp() {
  const [data, setData] = useState<Data | null>(null);
  const revision = useRef(0);
  const current = useRef<Data | null>(null);
  const saving = useRef(false);
  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<
    'log' | 'attack' | 'meds' | 'palette' | 'event' | null
  >(null);
  const [eventForm, setEventForm] = useState({
    at: new Date().toISOString(),
    type: 'symptom',
    text: '',
  });
  const [eventBusy, setEventBusy] = useState(false);
  const [eventError, setEventError] = useState('');
  const [logDate, setLogDate] = useState(dayKey());
  const [editingAttack, setEditingAttack] = useState<Attack | undefined>();
  const [editingIntake, setEditingIntake] = useState<Intake | undefined>();
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState('');
  const [fatal, setFatal] = useState('');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [reportDays, setReportDays] = useState(30);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [menu, setMenu] = useState(false);
  const [onboarding, setOnboarding] = useState({
    preventive: 'Atogepant',
    rescue: 'Zolmitriptan',
    wake: '07:30',
    bed: '23:30',
    coffee: 2,
    checkIn: '20:00',
  });
  async function switchMode(mode: Data['mode']) {
    if (saving.current) throw new Error('Aguarde a gravação em curso.');
    const stored = await loadData(mode);
    let next = stored.data;
    let rev = stored.revision;
    if (mode === 'demo' && !next.settings.onboarded) {
      next = demoData();
      rev = await persistData(next, rev);
    }
    current.current = next;
    revision.current = rev;
    setData(next);
    setModal(null);
    setView('dashboard');
    setSearch('');
  }
  useEffect(() => {
    switchMode('personal').catch((e) => setFatal(e.message));
    setOnline(navigator.onLine);
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    const timer = setInterval(() => setNow(new Date()), 1000);
    const installer = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', installer);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() =>
          setMessage(
            'Cache offline indisponível; verifique HTTPS e as permissões do navegador.',
          ),
        );
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
      window.removeEventListener('beforeinstallprompt', installer);
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal((m) => (m === 'palette' ? null : 'palette'));
        setInput('');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const remindersSent = useRef(new Set<string>());
  useEffect(() => {
    if (
      !data?.settings.reminders ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return;
    const time = now.toTimeString().slice(0, 5);
    for (const [at, text] of [
      [data.settings.morning, 'Check-in da manhã'],
      [data.settings.evening, 'Check-in da noite'],
      [data.settings.medicationReminder, 'Registar medicação'],
    ]) {
      const key = dayKey(now) + at + text;
      if (time === at && !remindersSent.current.has(key)) {
        remindersSent.current.add(key);
        new Notification('Migraine Terminal', {
          body: text,
          icon: '/icon-192.png',
        });
      }
    }
  }, [now, data]);
  async function commit(next: Data) {
    if (saving.current) throw new Error('Aguarde a gravação em curso.');
    if (current.current && next.mode !== current.current.mode)
      throw new Error('Conjunto inválido.');
    saving.current = true;
    try {
      const rev = await persistData(next, revision.current);
      revision.current = rev;
      current.current = next;
      setData(next);
    } finally {
      saving.current = false;
    }
  }
  function navigate(s: string) {
    setView(s as View);
    setMenu(false);
    setSearch('');
  }
  function openLog(date = dayKey()) {
    setLogDate(date);
    setModal('log');
  }
  function openAttack(attack?: Attack) {
    setEditingAttack(attack ?? current.current?.attacks.find((a) => !a.end));
    setModal('attack');
  }
  function openMeds(intake?: Intake) {
    setEditingIntake(intake);
    setModal('meds');
  }
  async function runCommand(value: string) {
    try {
      const result = command(value, current.current!);
      if (result.data !== current.current) await commit(result.data);
      if (result.view) navigate(result.view);
      if (result.action && /^\d+d$/.test(result.action))
        setReportDays(Math.min(3650, Number(result.action.slice(0, -1))));
      setMessage(result.message);
      setInput('');
      if (modal === 'palette') setModal(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Comando falhou');
    }
  }
  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setMessage(
        choice.outcome === 'accepted'
          ? 'Instalação solicitada.'
          : 'Instalação cancelada.',
      );
      setInstallPrompt(null);
    } else
      setMessage(
        'No navegador: menu → Instalar aplicação. No iPhone: Partilhar → Adicionar ao ecrã principal. Requer HTTPS e uma primeira visita online.',
      );
  }
  async function weather() {
    const d = current.current!;
    const w = await fetchWeather(d.settings);
    const log =
      d.logs.find((l) => l.date === dayKey()) ?? emptyLog(dayKey(), d.settings);
    await commit(saveLog(d, { ...log, weather: w }));
  }
  async function finishOnboarding() {
    try {
      const d = current.current!;
      const medications = [
        ...(onboarding.preventive.trim()
          ? [
              {
                id: uid(),
                name: onboarding.preventive.trim(),
                kind: 'preventive' as const,
                dosage: '',
              },
            ]
          : []),
        ...(onboarding.rescue.trim()
          ? [
              {
                id: uid(),
                name: onboarding.rescue.trim(),
                kind: 'rescue' as const,
                dosage: '',
              },
            ]
          : []),
      ];
      await commit({
        ...d,
        medications,
        settings: {
          ...d.settings,
          onboarded: true,
          wake: onboarding.wake,
          bed: onboarding.bed,
          usualCoffee: onboarding.coffee,
          checkIn: onboarding.checkIn,
        },
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao guardar');
    }
  }
  if (fatal)
    return (
      <div className="loading">
        <Database size={30} />
        <h1>Não foi possível abrir os dados locais</h1>
        <p role="alert">{fatal}</p>
        <p>
          Verifique se o navegador permite IndexedDB. Os dados existentes não
          foram apagados.
        </p>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </div>
    );
  if (!data)
    return (
      <div className="loading">
        <Terminal size={28} />
        <p>
          Initializing local database<span className="cursor">_</span>
        </p>
      </div>
    );
  const active = data.attacks.find((a) => !a.end);
  const isFirst = !data.settings.onboarded && data.mode === 'personal';
  const dateAttacks = data.attacks.filter((a) => attackOnDate(a, logDate));
  const dateIntakes = data.intakes.filter(
    (i) => dayKey(new Date(i.at)) === logDate,
  );
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Saltar para conteúdo
      </a>
      <aside className={`sidebar ${menu ? 'mobile-open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('dashboard');
          }}
        >
          <span className="brand-symbol">
            <Terminal size={22} />
          </span>
          <span>
            MIGRAINE
            <span>
              TERMINAL <small>v1.0</small>
            </span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">
            {data.mode === 'demo' ? 'D' : 'P'}
          </span>
          <div>
            {data.mode === 'demo' ? 'Demo workspace' : 'Personal workspace'}
            <small>
              <span className="dot" /> Local-first storage
            </small>
          </div>
          <ChevronRight size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Navegação principal">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate(id)}
            >
              <Icon size={17} />
              {label}
              {id === 'dashboard' && <span className="nav-count">01</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">SYSTEM</div>
        <button
          className={`nav-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
        >
          <SettingsIcon size={17} />
          Settings
        </button>
        <button
          className={`nav-item ${view === 'privacy' ? 'active' : ''}`}
          onClick={() => navigate('privacy')}
        >
          <Shield size={17} />
          Data privacy
        </button>
        <div className="sidebar-bottom">
          <div className="local-card">
            <Shield size={16} />
            <strong>Your data. Your device.</strong>
            <p>
              Sem conta. Sem publicidade.
              <br />
              Privado por desenho.
            </p>
          </div>
          <button
            className="command-shortcut"
            onClick={() => {
              setInput('');
              setModal('palette');
            }}
          >
            <Command size={14} />
            Command palette<kbd>⌘ K</kbd>
          </button>
          <div className="sidebar-footer">
            <span className="dot" /> ALL SYSTEMS LOCAL <span>v1.0.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="inline">
            <button
              className="mobile-menu"
              aria-label="Abrir navegação"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb">
              migraine<span>://</span>
              <b>{view}</b>
            </span>
          </div>
          <div className="top-actions">
            <span className="connection">
              {online ? (
                <>
                  <span className="dot" /> LOCAL DATABASE
                </>
              ) : (
                <>
                  <WifiOff size={13} /> OFFLINE · LOCAL DATA
                </>
              )}
            </span>
            <button
              className="search-button"
              onClick={() => {
                setInput('');
                setModal('palette');
              }}
              aria-label="Pesquisar ou executar comando"
            >
              <Search size={16} />
              <span>Pesquisar</span>
              <kbd>⌘ K</kbd>
            </button>
          </div>
        </header>
        {data.mode === 'demo' && (
          <div className="demo-banner">
            <span>
              DEMO MODE · 30 dias de dados fictícios. Os seus dados pessoais
              estão separados.
            </span>
            <button
              onClick={() =>
                void switchMode('personal').catch((e) => setMessage(e.message))
              }
            >
              Voltar aos meus dados <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        <main id="main" tabIndex={-1} className="content">
          {view === 'dashboard' && (
            <Dashboard
              data={data}
              now={now}
              openLog={openLog}
              openAttack={() => openAttack()}
              openMeds={() => openMeds()}
              openEvent={() => {
                setEventForm({
                  at: new Date().toISOString(),
                  type: 'symptom',
                  text: '',
                });
                setEventError('');
                setModal('event');
              }}
              navigate={navigate}
            />
          )}
          {view === 'analytics' && <Analytics data={data} />}{' '}
          {view === 'calendar' && <Calendar data={data} openLog={openLog} />}{' '}
          {view === 'reports' && (
            <Reports data={data} initialDays={reportDays} />
          )}{' '}
          {view === 'settings' && (
            <Settings
              key={data.mode}
              data={data}
              onSave={commit}
              switchMode={switchMode}
              onWeather={weather}
              install={() => void install()}
            />
          )}
          {view === 'medications' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">MEDICATION / INTAKE HISTORY</div>
                  <h1>
                    Medication<span className="cursor">_</span>
                  </h1>
                  <p>Registe o que tomou e a eficácia observada.</p>
                </div>
                <button className="primary" onClick={() => openMeds()}>
                  <Plus size={15} /> Registar toma
                </button>
              </div>
              <section className="panel">
                <div className="panel-title">
                  <span>YOUR MEDICATIONS</span>
                  <button
                    className="text-button"
                    onClick={() => navigate('settings')}
                  >
                    Configurar <ArrowUpRight size={14} />
                  </button>
                </div>
                {data.medications.map((m) => (
                  <div className="list-row" key={m.id}>
                    <span>
                      <Pill size={14} /> {m.name}
                    </span>
                    <span className="muted">
                      {m.kind} · {m.dosage || 'dose não definida'}
                    </span>
                  </div>
                ))}
              </section>
              <section className="panel">
                <div className="panel-title">
                  <span>INTAKE LOG</span>
                  <span>{data.intakes.length} tomas</span>
                </div>
                {data.intakes.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Data / hora</th>
                          <th>Medicamento</th>
                          <th>Dose</th>
                          <th>Eficácia</th>
                          <th>Melhoria</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.intakes]
                          .sort((a, b) => b.at.localeCompare(a.at))
                          .map((i) => (
                            <tr key={i.id}>
                              <td>{new Date(i.at).toLocaleString('pt-PT')}</td>
                              <td>
                                {i.name}
                                {i.secondDose ? ' · 2.ª dose' : ''}
                              </td>
                              <td>{i.dosage || '—'}</td>
                              <td>
                                {i.effectiveness === null
                                  ? '—'
                                  : i.effectiveness + '/10'}
                              </td>
                              <td>
                                {i.improvementMinutes === null
                                  ? '—'
                                  : i.improvementMinutes + 'm'}
                              </td>
                              <td>
                                <button onClick={() => openMeds(i)}>
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">
                    <Pill size={25} />
                    <p>Ainda sem tomas registadas.</p>
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="panel-title">
                  <span>ATTACK HISTORY</span>
                </div>
                {data.attacks.length ? (
                  [...data.attacks]
                    .sort((a, b) => b.start.localeCompare(a.start))
                    .map((a) => (
                      <div className="list-row" key={a.id}>
                        <span>
                          {new Date(a.start).toLocaleString('pt-PT')} ·{' '}
                          {a.maxIntensity}/10 · {a.end ? 'Concluída' : 'Activa'}
                        </span>
                        <button onClick={() => openAttack(a)}>Detalhes</button>
                      </div>
                    ))
                ) : (
                  <p className="empty">Sem crises registadas.</p>
                )}
              </section>
            </>
          )}
          {view === 'privacy' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DATA PRIVACY</div>
                  <h1>
                    Your health data
                    <br />
                    belongs to you<span className="cursor">_</span>
                  </h1>
                </div>
                <Shield size={34} className="green" />
              </div>
              <section className="panel prose">
                <h2>Os seus dados ficam neste dispositivo.</h2>
                <p>
                  Registos, crises, medicação e definições são guardados numa
                  base de dados IndexedDB do navegador. Não há backend de saúde,
                  conta, publicidade, analytics de marketing ou sincronização
                  entre dispositivos. O servidor de alojamento apenas serve a
                  aplicação e pode registar pedidos de rede normais.
                </p>
                <h3>Backup e restauro</h3>
                <p>
                  Exporte um backup JSON nas definições. Pode restaurá-lo no
                  mesmo conjunto pessoal ou demo. O navegador pode eliminar
                  dados locais ao limpar armazenamento; a navegação privada e a
                  remoção da app podem afectar a persistência. Mantenha backups
                  num local protegido.
                </p>
                <h3>Segurança no dispositivo</h3>
                <p>
                  Esta versão não encripta a base de dados com uma
                  palavra-passe. Outras pessoas com acesso ao seu perfil de
                  navegador podem consultar os registos. Use um dispositivo e
                  perfil protegidos. Ficheiros PDF, CSV e JSON exportados contêm
                  informação de saúde.
                </p>
                <h3>Meteorologia e notificações</h3>
                <p>
                  A meteorologia é opcional e envia apenas coordenadas para
                  Open-Meteo. As notificações estão desactivadas por defeito e,
                  nesta versão, exigem que a app esteja aberta.
                </p>
                <h3>Track. Observe. Understand.</h3>
                <p>
                  Esta ferramenta organiza informação. Não diagnostica, não
                  recomenda tratamento e não altera medicação. As análises
                  mostram possíveis associações, sem concluir causas.
                </p>
                <button onClick={() => navigate('settings')}>
                  Gerir os meus dados <ArrowUpRight size={14} />
                </button>
              </section>
            </>
          )}
          <form
            className="terminal-input"
            onSubmit={(e) => {
              e.preventDefault();
              void runCommand(input);
            }}
          >
            <span className="green">&gt;</span>
            <input
              aria-label="Comando terminal"
              placeholder="Escreva um comando…  ex: log water 500ml"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" aria-label="Executar comando">
              <ChevronRight size={18} />
            </button>
            <kbd>enter ↵</kbd>
          </form>
          <footer className="content-footer">
            <span>
              migraine://tracker{' '}
              <span className="muted">— Health Log System</span>
            </span>
            <span>
              <Database size={12} /> LOCAL-FIRST / NO TRACKING
            </span>
          </footer>
        </main>
        <nav className="mobile-actions" aria-label="Acções rápidas">
          <button onClick={() => openLog()}>
            <Plus size={19} />
            LOG
          </button>
          <button className={active ? 'red' : ''} onClick={() => openAttack()}>
            <Activity size={19} />
            MIGRAINE
          </button>
          <button onClick={() => openMeds()}>
            <Pill size={19} />
            MEDS
          </button>
          <button onClick={() => navigate('dashboard')}>
            <LayoutDashboard size={19} />
            TODAY
          </button>
        </nav>
      </div>
      {message && (
        <div className="toast" role="status">
          <Terminal size={16} />
          <span>{message}</span>
          <button aria-label="Fechar mensagem" onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {isFirst && (
        <Modal
          title="Welcome to Migraine Terminal"
          dismissable={false}
          onClose={() => {}}
        >
          <div className="onboarding-intro">
            <span className="large-terminal">
              <Terminal size={36} />
            </span>
            <h2>Track. Observe. Understand.</h2>
            <p>
              O seu diário pessoal de enxaquecas.
              <br />
              Local, privado e sempre consigo.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void finishOnboarding();
            }}
          >
            <div className="form-grid">
              <Field
                label="Medicação preventiva (opcional)"
                value={onboarding.preventive}
                onChange={(v) =>
                  setOnboarding({ ...onboarding, preventive: v })
                }
              />
              <Field
                label="Medicação de resgate (opcional)"
                value={onboarding.rescue}
                onChange={(v) => setOnboarding({ ...onboarding, rescue: v })}
              />
              <Field
                label="Hora de acordar"
                type="time"
                value={onboarding.wake}
                onChange={(v) => setOnboarding({ ...onboarding, wake: v })}
              />
              <Field
                label="Hora de deitar"
                type="time"
                value={onboarding.bed}
                onChange={(v) => setOnboarding({ ...onboarding, bed: v })}
              />
              <Field
                label="Cafés habituais / dia"
                type="number"
                min={0}
                max={30}
                value={onboarding.coffee}
                onChange={(v) =>
                  setOnboarding({ ...onboarding, coffee: Number(v) })
                }
              />
              <Field
                label="Hora de check-in"
                type="time"
                value={onboarding.checkIn}
                onChange={(v) => setOnboarding({ ...onboarding, checkIn: v })}
              />
            </div>
            <p className="hint">
              Apenas defaults; nenhuma toma é registada automaticamente.
            </p>
            <div className="form-footer">
              <button
                type="button"
                onClick={() =>
                  void switchMode('demo').catch((e) => setMessage(e.message))
                }
              >
                Explorar demo
              </button>
              <button type="submit" className="primary">
                Começar o meu diário <ArrowUpRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {!isFirst && modal === 'event' && (
        <Modal title="Log event / timeline" onClose={() => setModal(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEventBusy(true);
              setEventError('');
              try {
                if (!eventForm.text.trim())
                  throw new Error('Descreva o evento.');
                await commit(
                  event(
                    current.current!,
                    eventForm.type,
                    eventForm.text.trim(),
                    eventForm.at,
                  ),
                );
                setModal(null);
                setMessage('Evento guardado.');
              } catch (e) {
                setEventError(
                  e instanceof Error ? e.message : 'Erro ao guardar',
                );
              } finally {
                setEventBusy(false);
              }
            }}
          >
            <Field
              label="Data e hora do evento"
              required
              type="datetime-local"
              value={toLocal(eventForm.at)}
              onChange={(v) => {
                if (v)
                  setEventForm({ ...eventForm, at: new Date(v).toISOString() });
              }}
            />
            <Select
              label="Tipo de evento"
              value={eventForm.type}
              options={[
                ['symptom', 'Sintoma'],
                ['improvement', 'Melhoria da dor'],
                ['food', 'Refeição'],
                ['wake', 'Acordar'],
                ['other', 'Outro'],
              ]}
              onChange={(v) => setEventForm({ ...eventForm, type: v })}
            />
            <TextArea
              label="Descrição do evento"
              value={eventForm.text}
              onChange={(v) => setEventForm({ ...eventForm, text: v })}
            />
            {eventError && (
              <p role="alert" className="error">
                {eventError}
              </p>
            )}
            <button className="primary" disabled={eventBusy}>
              Guardar evento
            </button>
          </form>
        </Modal>
      )}
      {!isFirst && modal === 'log' && (
        <Modal
          title={`Daily check-in / ${logDate}`}
          onClose={() => setModal(null)}
        >
          {(dateAttacks.length > 0 || dateIntakes.length > 0) && (
            <div className="day-context">
              {dateAttacks.map((a) => (
                <button key={a.id} onClick={() => openAttack(a)}>
                  × Crise · {a.maxIntensity}/10 ·{' '}
                  {a.end ? 'concluída' : 'activa'}
                </button>
              ))}
              {dateIntakes.map((i) => (
                <button key={i.id} onClick={() => openMeds(i)}>
                  Toma · {i.name} ·{' '}
                  {new Date(i.at).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          )}
          <LogForm
            key={logDate}
            initial={
              data.logs.find((l) => l.date === logDate) ??
              emptyLog(logDate, data.settings)
            }
            settings={data.settings}
            medications={data.medications}
            onCancel={() => setModal(null)}
            onSave={async (log) => {
              if (
                current.current!.intakes.some(
                  (i) =>
                    dayKey(new Date(i.at)) === log.date &&
                    log.missedMedications.includes(i.name),
                )
              ) {
                throw new Error(
                  'Existe uma toma registada para um medicamento marcado como não tomado. Confirme o histórico antes de guardar.',
                );
              }
              const existing = current.current?.logs.find(
                (l) => l.date === log.date,
              );
              if (
                log.date !== logDate &&
                existing &&
                !window.confirm(
                  'Já existe um registo para esta data. Substituir?',
                )
              )
                return;
              let warning = '';
              if (
                data.settings.weatherEnabled &&
                log.date === dayKey() &&
                online &&
                !log.weather
              ) {
                try {
                  log.weather = await fetchWeather(data.settings);
                } catch {
                  warning =
                    ' Meteorologia indisponível; o registo foi guardado.';
                }
              }
              await commit(
                event(
                  saveLog(current.current!, log),
                  'check-in',
                  'Check-in guardado',
                ),
              );
              setModal(null);
              setMessage('Registo guardado.' + warning);
            }}
          />
        </Modal>
      )}
      {!isFirst && modal === 'attack' && (
        <Modal
          title={editingAttack ? 'Migraine / update' : 'Start migraine'}
          onClose={() => setModal(null)}
        >
          <AttackForm
            key={editingAttack?.id ?? 'new'}
            attack={editingAttack}
            onSave={async (fields) => {
              const d = current.current!;
              if (new Date(fields.start!).getTime() > Date.now())
                throw new Error('O início não pode estar no futuro.');
              await commit(
                editingAttack
                  ? updateAttack(d, editingAttack.id, fields)
                  : startAttack(d, fields),
              );
              setModal(null);
              setMessage('Crise guardada.');
            }}
            onEnd={async (fields) => {
              const d = current.current!;
              const ending = fields.end ? new Date(fields.end) : new Date();
              if (ending.getTime() > Date.now())
                throw new Error('O fim não pode estar no futuro.');
              await commit(endAttack(d, fields, ending));
              setModal(null);
              setMessage('Crise terminada e duração guardada.');
            }}
          />
        </Modal>
      )}
      {!isFirst && modal === 'meds' && (
        <Modal title="Medication / intake" onClose={() => setModal(null)}>
          <MedicationForm
            key={editingIntake?.id ?? 'new'}
            data={data}
            initial={editingIntake}
            onSave={async (intake) => {
              await commit(
                editingIntake
                  ? {
                      ...current.current!,
                      intakes: current.current!.intakes.map((i) =>
                        i.id === intake.id ? intake : i,
                      ),
                    }
                  : takeMedication(current.current!, intake),
              );
              setModal(null);
              setMessage('Toma guardada.');
            }}
          />
        </Modal>
      )}
      {!isFirst && modal === 'palette' && (
        <Modal title="Command palette / search" onClose={() => setModal(null)}>
          <form
            className="palette-input"
            onSubmit={(e) => {
              e.preventDefault();
              void runCommand(input);
            }}
          >
            <Terminal size={17} />
            <input
              autoFocus
              aria-label="Comando ou pesquisa"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Comando ou texto a pesquisar…"
            />
            <button>Executar ↵</button>
          </form>
          <div className="palette-suggestions">
            {[
              'today',
              'log pain 6',
              'log coffee',
              'log water 500ml',
              'log stress 8',
              active ? 'migraine stop' : 'migraine start',
              'meds',
              'report 30d',
            ]
              .filter((c) => !input || c.includes(input.toLowerCase()))
              .map((c) => (
                <button key={c} onClick={() => void runCommand(c)}>
                  <Terminal size={13} />
                  {c}
                  <span>↵</span>
                </button>
              ))}
          </div>
          <button
            className="secondary"
            onClick={() => {
              setSearch(input);
              setModal(null);
            }}
          >
            <Search size={15} /> Pesquisar nos registos
          </button>
          <p className="hint">
            Pesquisa por texto ou «sleep less than 6h». Enter executa comandos;
            o botão pesquisa registos.
          </p>
        </Modal>
      )}
      {search && (
        <Modal title={`Search / ${search}`} onClose={() => setSearch('')}>
          <div className="search-results">
            {searchData(data, search).length ? (
              searchData(data, search).map((l) => (
                <button
                  className="list-row"
                  key={l.id}
                  onClick={() => {
                    setSearch('');
                    openLog(l.date);
                  }}
                >
                  <span>
                    {l.date} · {labels[l.state]}
                    <small>
                      {l.notes || l.triggers.join(', ') || 'Registo diário'}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="empty">
                Nenhum registo encontrado. Experimente um nome de medicamento,
                sintoma ou nota.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
