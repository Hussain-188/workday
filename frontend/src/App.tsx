import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { apiError, authApi } from './api/client';
import { Role, User } from './api/workforce';
import { useAuthStore } from './store/authStore';
import { imagery } from './assets';
import { Avatar, ErrorNote, Photo } from './ui';
import {
  AssignmentsView,
  ContractsView,
  DashboardView,
  InvoicesView,
  TeamsView,
  TimesheetsView,
  WorkersView,
} from './WorkforceViews';

const BRAND = 'Meridian';

type Tab = 'dashboard' | 'teams' | 'workers' | 'assignments' | 'timesheets' | 'contracts' | 'invoices';

type NavItem = { id: Tab; label: string; icon: any; roles: Role[]; group: string; blurb: string };

const ALL: Role[] = ['admin', 'hr', 'manager', 'project_manager', 'worker'];

const nav: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    roles: ALL,
    group: 'Workspace',
    blurb: 'The state of your workforce, at a glance.',
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: UsersRound,
    roles: ['admin', 'hr', 'manager'],
    group: 'Organisation',
    blurb: 'Every team, and the manager accountable for it.',
  },
  {
    id: 'workers',
    label: 'People',
    icon: ShieldCheck,
    roles: ['admin', 'hr', 'manager'],
    group: 'Organisation',
    blurb: 'The full worker lifecycle, from onboarding to offboarding.',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    icon: FileText,
    roles: ['admin', 'hr', 'manager'],
    group: 'Organisation',
    blurb: 'The commercial agreements every assignment bills against.',
  },
  {
    id: 'assignments',
    label: 'Assignments',
    icon: BriefcaseBusiness,
    roles: ['admin', 'hr', 'manager', 'worker'],
    group: 'Delivery',
    blurb: 'Team-owned work items, each with its own milestone budget.',
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    icon: Clock3,
    roles: ['admin', 'hr', 'manager', 'worker'],
    group: 'Delivery',
    blurb: 'Weekly hours, and the soft-cap reviews they trigger.',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    roles: ['admin', 'hr', 'manager', 'project_manager'],
    group: 'Delivery',
    blurb: 'Billing raised against contracts, and the decisions on it.',
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  hr: 'People operations',
  manager: 'Delivery manager',
  project_manager: 'Project manager',
  worker: 'Team member',
};

// ── Mark ────────────────────────────────────────────────────────────────────

const Mark = ({ size = 36, tone = 'dark' }: { size?: number; tone?: 'dark' | 'light' }) => (
  <span
    style={{ width: size, height: size }}
    className={`grid shrink-0 place-items-center rounded-xl ${
      tone === 'dark' ? 'bg-pine-700' : 'bg-pine-50'
    }`}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V6l6 9 6-13 4 17"
        stroke={tone === 'dark' ? '#B6D2C3' : '#1D4436'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

// ── Sign in ─────────────────────────────────────────────────────────────────

function SignIn() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await authApi.login(email, password);
      setAuth(data.user as any, data.access_token);
    } catch (err: any) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial column */}
      <div className="photo-scrim relative hidden overflow-hidden bg-pine-950 lg:block">
        <Photo
          src={imagery.signIn}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-[.55]"
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-14">
          <div className="animate-fade-in flex items-center gap-3">
            <Mark size={38} />
            <span className="text-lg font-semibold tracking-tight text-white">{BRAND}</span>
          </div>

          <div className="max-w-xl">
            <p className="eyebrow animate-fade-up text-pine-200">Workforce operations</p>
            <h1
              className="display mt-6 text-[clamp(2.75rem,4.4vw,4.25rem)] text-white animate-fade-up"
              style={{ animationDelay: '.08s' }}
            >
              Every hour, every contract,
              <br />
              <em className="text-pine-200">accounted for.</em>
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-md text-[15px] leading-relaxed text-white/70"
              style={{ animationDelay: '.16s' }}
            >
              {BRAND} joins people, assignments, timesheets and billing into a single
              record — so the number on the invoice is the number that was worked.
            </p>
          </div>

          <dl
            className="animate-fade-up grid grid-cols-3 gap-8 border-t border-white/15 pt-8"
            style={{ animationDelay: '.24s' }}
          >
            {[
              ['Soft-cap', 'budget guardrails'],
              ['One ledger', 'hours to invoice'],
              ['Role-aware', 'access by design'],
            ].map(([head, note]) => (
              <div key={head}>
                <dt className="text-sm font-semibold text-white">{head}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">{note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Form column */}
      <div className="app-shell flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Mark size={38} />
            <span className="text-lg font-semibold tracking-tight">{BRAND}</span>
          </div>

          <p className="eyebrow animate-fade-up">Sign in</p>
          <h2
            className="display animate-fade-up mt-3 text-[2.5rem] text-ink-900"
            style={{ animationDelay: '.05s' }}
          >
            Welcome back
          </h2>
          <p
            className="animate-fade-up mt-3 text-sm leading-relaxed text-ink-500"
            style={{ animationDelay: '.1s' }}
          >
            Use your work account to continue to the operations workspace.
          </p>

          <form
            onSubmit={submit}
            className="animate-fade-up mt-9 space-y-5"
            style={{ animationDelay: '.15s' }}
          >
            <ErrorNote text={error} />
            <div>
              <label className="label" htmlFor="email">
                Work email
              </label>
              <input
                id="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn-primary group w-full !py-3" disabled={busy}>
              {busy ? 'Signing in…' : 'Continue'}
              {!busy && (
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 ease-smooth group-hover:translate-x-1"
                />
              )}
            </button>
          </form>

          <p className="mt-10 border-t border-ink-200 pt-6 text-xs leading-relaxed text-ink-400">
            Access is scoped to your role. Administrators, people operations, delivery
            managers, project managers and team members each see only their own workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Boot ────────────────────────────────────────────────────────────────────

const Booting = () => (
  <div className="app-shell grid min-h-screen place-items-center">
    <div className="animate-fade-in flex flex-col items-center gap-5">
      <Mark size={44} />
      <div className="h-0.5 w-28 overflow-hidden rounded-full bg-ink-200">
        <div className="h-full w-1/3 animate-[loader_1.3s_cubic-bezier(.4,0,.2,1)_infinite] rounded-full bg-pine-600" />
      </div>
    </div>
  </div>
);

// ── Shell ───────────────────────────────────────────────────────────────────

export default function App() {
  const { user, token, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecked(true);
      return;
    }
    authApi
      .me()
      .then(() => setChecked(true))
      .catch(() => {
        logout();
        setChecked(true);
      });
  }, [token, logout]);

  if (!checked) return <Booting />;
  if (!user || !token) return <SignIn />;

  const current = user as unknown as User;
  const allowed = nav.filter((n) => n.roles.includes(current.role));
  const groups = [...new Set(allowed.map((n) => n.group))];
  const active = allowed.find((n) => n.id === tab) ?? allowed[0];
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="app-shell min-h-screen">
      {/* Rail */}
      <aside className="rail fixed inset-y-0 left-0 z-30 flex w-20 flex-col overflow-hidden text-ink-400 lg:w-[272px]">
        <div className="rail-bloom" />

        <div className="relative flex items-center gap-3 px-5 py-6 lg:px-6">
          <Mark size={38} />
          <div className="hidden min-w-0 lg:block">
            <div className="truncate text-[15px] font-semibold tracking-tight text-white">{BRAND}</div>
            <div className="mt-0.5 text-2xs tracking-normal text-ink-500">Operations workspace</div>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 pb-4 lg:px-4">
          {groups.map((group) => (
            <div key={group} className="mb-6">
              <p className="mb-2 hidden px-3 text-2xs font-semibold tracked text-ink-600 lg:block">
                {group}
              </p>
              <div className="space-y-1">
                {allowed
                  .filter((n) => n.group === group)
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      title={item.label}
                      className={`rail-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        tab === item.id ? 'is-active' : 'text-ink-400'
                      }`}
                    >
                      <item.icon size={17} strokeWidth={1.75} className="mx-auto lg:mx-0 shrink-0" />
                      <span className="hidden truncate lg:inline">{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-white/[.07] p-3 lg:p-4">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2 lg:bg-white/[.04] lg:px-3 lg:py-3">
            <Avatar name={current.name} size={34} />
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-sm font-medium text-white">{current.name}</div>
              <div className="mt-0.5 truncate text-2xs tracking-normal text-ink-500">
                {ROLE_LABEL[current.role]}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="hidden rounded-lg p-1.5 text-ink-500 transition-colors duration-200 hover:bg-white/[.06] hover:text-white lg:block"
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="mt-1 grid w-full place-items-center rounded-lg py-2 text-ink-500 transition-colors hover:text-white lg:hidden"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="ml-20 lg:ml-[272px]">
        <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-[#f6f5f1]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 py-3.5 lg:px-10">
            <nav className="flex items-center gap-2 text-xs text-ink-400">
              <span>{BRAND}</span>
              <span className="text-ink-300">/</span>
              <span className="font-medium text-ink-700">{active?.label}</span>
            </nav>
            <div className="flex items-center gap-5">
              <span className="hidden text-xs text-ink-400 md:inline">{today}</span>
              <span className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-pine-500" />
                <span className="text-2xs font-medium tracking-normal text-ink-500">
                  All systems nominal
                </span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-6 pb-20 pt-10 lg:px-10">
          <div key={tab} className="animate-fade-up">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">{ROLE_LABEL[current.role]}</p>
                <h1 className="display mt-3 text-[2.5rem] leading-none text-ink-900 lg:text-[3rem]">
                  {active?.label}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500">{active?.blurb}</p>
              </div>
            </div>

            {tab === 'dashboard' && <DashboardView user={current} />}
            {tab === 'teams' && <TeamsView user={current} />}
            {tab === 'workers' && <WorkersView user={current} />}
            {tab === 'assignments' && <AssignmentsView user={current} />}
            {tab === 'timesheets' && <TimesheetsView user={current} />}
            {tab === 'contracts' && <ContractsView user={current} />}
            {tab === 'invoices' && <InvoicesView user={current} />}
          </div>
        </main>
      </div>
    </div>
  );
}
