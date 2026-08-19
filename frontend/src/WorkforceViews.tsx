import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarRange,
  CheckCheck,
  Clock3,
  Download,
  FileText,
  Gauge,
  Receipt,
  Send,
  Sparkles,
  UserMinus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Assignment, Contract, Entry, Invoice, Team, Timesheet, User, Worker, workforceApi } from './api/workforce';
import { apiError, authApi } from './api/client';
import { imagery } from './assets';
import {
  Avatar,
  Card,
  ClearFilters,
  EmptyState,
  ErrorNote,
  FilterBar,
  FilterOption,
  FilterSelect,
  Hint,
  matchesQuery,
  Modal,
  Photo,
  SearchField,
  SectionHead,
  Skeleton,
  Tag,
  useConfirm,
  useCountUp,
} from './ui';

const err = (e: any) => apiError(e);

const money = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (iso: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** ENUM_VALUE → "Enum value" for filter-dropdown labels. */
const prettyLabel = (s: string) => {
  const lower = s.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const statusOptions = (values: string[]): FilterOption[] =>
  values.map((v) => ({ value: v, label: prettyLabel(v) }));
/** Distinct values of one field across a list, alphabetised, for a filter dropdown. */
const distinctOptions = <T,>(items: T[], pick: (item: T) => string | null | undefined): FilterOption[] =>
  [...new Set(items.map(pick).filter((v): v is string => !!v))]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));

/** The right-hand column: a form that stays with you as the list scrolls. */
const Aside = ({ children }: { children: ReactNode }) => (
  <div className="lg:sticky lg:top-24 lg:self-start">{children}</div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div>
    <label className="label">
      {label}
      {hint && <span className="ml-1.5 font-normal normal-case tracking-normal text-ink-400">{hint}</span>}
    </label>
    {children}
  </div>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <span className="text-xs text-ink-400">{label}</span>
    <span className="text-right text-sm font-medium tabular text-ink-800">{children}</span>
  </div>
);

// ── Overview ────────────────────────────────────────────────────────────────

const METRICS: Record<string, { label: string; icon: any }> = {
  total_workers: { label: 'Total workers', icon: UsersRound },
  active_workers: { label: 'Active workers', icon: UserRound },
  offboarded_workers: { label: 'Offboarded', icon: UserMinus },
  teams: { label: 'Teams', icon: UsersRound },
  my_teams: { label: 'My teams', icon: UsersRound },
  my_workers: { label: 'People I manage', icon: UserRound },
  active_assignments: { label: 'Active assignments', icon: BriefcaseBusiness },
  submitted_timesheets: { label: 'Submitted timesheets', icon: CheckCheck },
  draft_timesheets: { label: 'Draft timesheets', icon: Clock3 },
  contracts: { label: 'Contracts', icon: FileText },
  invoices_pending_approval: { label: 'Invoices awaiting decision', icon: Receipt },
  hours_submitted: { label: 'Hours submitted', icon: Gauge },
};

function Metric({ metricKey, value, index }: { metricKey: string; value: number; index: number }) {
  const meta = METRICS[metricKey] ?? { label: metricKey.replace(/_/g, ' '), icon: Sparkles };
  const shown = useCountUp(Number(value) || 0);
  const Icon = meta.icon;
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-ink-200/70 bg-white p-6 transition-[transform,box-shadow,border-color] duration-500 ease-smooth hover:-translate-y-1 hover:border-pine-200 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <p className="max-w-[9rem] text-2xs font-semibold tracked text-ink-400">{meta.label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-50 text-ink-400 transition-colors duration-500 group-hover:bg-pine-50 group-hover:text-pine-600">
          <Icon size={16} strokeWidth={1.75} />
        </span>
      </div>
      <p className="display mt-7 text-[2.75rem] leading-none tabular text-ink-900">{shown}</p>
      <div className="mt-6 h-px w-full bg-ink-100">
        <div
          className="h-px origin-left animate-draw-in bg-pine-500/60"
          style={{ width: `${Math.min(100, 22 + index * 13)}%`, animationDelay: `${index * 90}ms` }}
        />
      </div>
    </article>
  );
}

const ROLE_NOTE: Record<string, string> = {
  admin: 'Organisation-wide visibility across people, teams, assignments, contracts and billing.',
  hr: 'The complete worker lifecycle — onboard, place on a team, and offboard cleanly.',
  manager: 'Assignments, hours and invoicing for the teams you are accountable for.',
  project_manager: 'Invoices submitted for your approval, with the work behind each one.',
  worker: 'Your team’s assignments and your own weekly hours.',
};

export function DashboardView({ user }: { user: User }) {
  const [data, setData] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    workforceApi.dashboard().then(setData).catch(() => setData({}));
  }, []);

  const tiles = Object.entries(data ?? {}).filter(([k]) => k !== 'role');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Welcome band */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/70 bg-pine-950 shadow-lift">
        <Photo
          src={imagery.welcome}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-[58%] object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-950 via-pine-950/95 to-pine-950/40" />
        <div className="relative flex flex-col justify-between gap-8 p-8 lg:p-10">
          <div className="max-w-xl">
            <p className="eyebrow text-pine-300">{greeting}</p>
            <h2 className="display mt-4 text-[2.25rem] leading-tight text-white lg:text-[2.75rem]">
              {user.name.split(' ')[0]}, here is where things stand.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              {ROLE_NOTE[user.role] ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={38} />
            <div>
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-2xs tracking-normal text-white/45">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {!data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[186px] rounded-3xl" />
          ))}
        </div>
      ) : tiles.length ? (
        <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map(([key, value], i) => (
            <Metric key={key} metricKey={key} value={value} index={i} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState title="Nothing to report yet" note="Figures appear here as work moves through the system." />
        </Card>
      )}
    </div>
  );
}

// ── Teams ───────────────────────────────────────────────────────────────────

export function TeamsView({ user }: { user: User }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', manager_id: '' });
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => teams.filter((t) => matchesQuery(q, t.name, t.description, t.manager_name)),
    [teams, q],
  );

  const load = () => workforceApi.teams().then(setTeams).catch((e) => setError(err(e)));
  // Only an admin may create a team, so only an admin needs the manager picker.
  useEffect(() => {
    load();
    if (user.role === 'admin')
      authApi.listUsers('MANAGER').then((x: User[]) => setManagers(x)).catch((e) => setError(err(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.createTeam({ ...form, manager_id: Number(form.manager_id) });
      setForm({ name: '', description: '', manager_id: '' });
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  return (
    <div className={`grid gap-6 ${user.role === 'admin' ? 'xl:grid-cols-[1fr_380px]' : ''}`}>
      <Card>
        <SectionHead
          eyebrow="Directory"
          title={user.role === 'manager' ? 'My teams' : 'All teams'}
          note="Each team carries a single accountable manager; assignments and hours roll up through them."
          action={
            <span className="chip tabular">
              {filtered.length} of {teams.length}
            </span>
          }
        />
        <ErrorNote text={error} />
        {teams.length > 0 && (
          <FilterBar>
            <SearchField value={q} onChange={setQ} placeholder="Search teams or managers…" />
            {q && <ClearFilters onClick={() => setQ('')} />}
          </FilterBar>
        )}
        {filtered.length ? (
          <div className="stagger grid gap-3 md:grid-cols-2">
            {filtered.map((t) => (
              <article key={t.id} className="panel panel-hover flex flex-col justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-ink-900">{t.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
                    {t.description || 'No description provided.'}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2.5 border-t border-ink-100 pt-4">
                  <Avatar name={t.manager_name} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink-800">{t.manager_name}</p>
                    <p className="text-2xs tracking-normal text-ink-400">Manager</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : teams.length ? (
          <EmptyState title="No teams match those filters" note="Try a different search." />
        ) : (
          <EmptyState title="No teams yet" note="An administrator creates teams and appoints a manager to each." />
        )}
      </Card>

      {user.role === 'admin' && (
        <Aside>
          <Card>
            <SectionHead eyebrow="New" title="Create a team" />
            <form onSubmit={create} className="space-y-4">
              <ErrorNote text={error} />
              <Field label="Team name">
                <input
                  className="input"
                  placeholder="e.g. Platform Engineering"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Description" hint="optional">
                <textarea
                  className="input"
                  placeholder="What this team is responsible for"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <Field label="Accountable manager">
                <select
                  className="input"
                  value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  required
                >
                  <option value="">Select manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!managers.length && <Hint>No managers exist yet — onboard a MANAGER-role user first.</Hint>}
              <button className="btn-primary w-full" disabled={!managers.length}>
                Create team
              </button>
            </form>
          </Card>
        </Aside>
      )}
    </div>
  );
}

// ── People ──────────────────────────────────────────────────────────────────

const WORKER_STATUS_OPTIONS = statusOptions(['ACTIVE', 'INACTIVE', 'OFFBOARDED']);
const WORKER_TYPE_OPTIONS = statusOptions(['EMPLOYEE', 'CONTRACTOR', 'TEMPORARY_WORKER']);

export function WorkersView({ user }: { user: User }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [ask, confirmUi] = useConfirm();
  const [q, setQ] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const initial = {
    name: '',
    email: '',
    employee_code: '',
    worker_type: 'CONTRACTOR',
    employment_start_date: '',
    team_id: '',
    password: '',
    hourly_rate: '',
  };
  const [form, setForm] = useState(initial);

  const load = () =>
    Promise.all([workforceApi.workers(), workforceApi.teams()])
      .then(([w, t]) => {
        setWorkers(w);
        setTeams(t);
      })
      .catch((e) => setError(err(e)));
  useEffect(() => {
    load();
  }, []);

  async function onboard(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.onboard({ ...form, team_id: Number(form.team_id) });
      setForm(initial);
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  async function offboard(id: number) {
    try {
      await workforceApi.offboard(id);
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  const activeCount = workers.filter((w) => w.status === 'ACTIVE').length;
  const teamOptions = useMemo(() => distinctOptions(teams, (t) => t.name), [teams]);
  const filtered = useMemo(
    () =>
      workers.filter(
        (w) =>
          matchesQuery(q, w.name, w.email, w.employee_code) &&
          (!teamFilter || w.team_name === teamFilter) &&
          (!statusFilter || w.status === statusFilter) &&
          (!typeFilter || w.worker_type === typeFilter),
      ),
    [workers, q, teamFilter, statusFilter, typeFilter],
  );
  const filtersActive = q || teamFilter || statusFilter || typeFilter;
  const clearAll = () => {
    setQ('');
    setTeamFilter('');
    setStatusFilter('');
    setTypeFilter('');
  };

  return (
    <div className={`grid gap-6 ${user.role === 'hr' ? 'xl:grid-cols-[1fr_400px]' : ''}`}>
      {confirmUi}
      <Card>
        <SectionHead
          eyebrow="Directory"
          title="People"
          note="Everyone on the books, the team they sit with, and the rate their submitted hours bill at."
          action={
            <span className="chip tabular">
              {filtersActive ? `${filtered.length} of ${workers.length}` : `${activeCount} active · ${workers.length} total`}
            </span>
          }
        />
        {workers.length > 0 && (
          <FilterBar>
            <SearchField value={q} onChange={setQ} placeholder="Search name, email or code…" />
            <FilterSelect value={teamFilter} onChange={setTeamFilter} options={teamOptions} placeholder="All teams" />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={WORKER_STATUS_OPTIONS}
              placeholder="All statuses"
            />
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={WORKER_TYPE_OPTIONS}
              placeholder="All engagements"
            />
            {filtersActive && <ClearFilters onClick={clearAll} />}
          </FilterBar>
        )}
        <ErrorNote text={error} />
        {filtered.length ? (
          <div className="-mx-2 overflow-x-auto px-2">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Code</th>
                  <th>Engagement</th>
                  <th>Team</th>
                  <th className="text-right">Rate</th>
                  <th>Status</th>
                  {user.role === 'hr' && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={w.name} size={34} />
                        <div className="min-w-0">
                          <b className="font-medium text-ink-900">{w.name}</b>
                          <small>{w.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-ink-500">{w.employee_code}</td>
                    <td className="text-ink-600">{w.worker_type.replace(/_/g, ' ').toLowerCase()}</td>
                    <td>{w.team_name}</td>
                    <td className="text-right tabular font-medium text-ink-900">
                      {money(w.hourly_rate)}
                      <small className="text-right">per hour</small>
                    </td>
                    <td>
                      <Tag status={w.status} />
                    </td>
                    {user.role === 'hr' && (
                      <td className="text-right">
                        {w.status === 'ACTIVE' && (
                          <button
                            onClick={() =>
                              ask({
                                title: `Offboard ${w.name}?`,
                                note: 'Their access ends immediately. Timesheets, assignments and invoices already recorded stay exactly as they are.',
                                confirmLabel: 'Offboard',
                                tone: 'danger',
                                onConfirm: () => offboard(w.id),
                              })
                            }
                            className="btn-danger btn-sm"
                          >
                            Offboard
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : workers.length ? (
          <EmptyState title="No one matches those filters" note="Try clearing a filter or broadening your search." />
        ) : (
          <EmptyState title="No people on record" note="People operations onboards workers onto an existing team." />
        )}
      </Card>

      {user.role === 'hr' && (
        <Aside>
          <Card>
            <SectionHead eyebrow="Onboarding" title="Add a worker" />
            <form onSubmit={onboard} className="space-y-4">
              <ErrorNote text={error} />
              <Field label="Full name">
                <input
                  className="input"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Work email">
                <input
                  className="input"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Employee code">
                  <input
                    className="input font-mono text-xs"
                    placeholder="EMP-014"
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Engagement">
                  <select
                    className="input"
                    value={form.worker_type}
                    onChange={(e) => setForm({ ...form, worker_type: e.target.value })}
                  >
                    <option value="CONTRACTOR">Contractor</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="TEMPORARY_WORKER">Temporary worker</option>
                  </select>
                </Field>
              </div>
              <Field label="Start date">
                <input
                  className="input"
                  type="date"
                  value={form.employment_start_date}
                  onChange={(e) => setForm({ ...form, employment_start_date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Team">
                <select
                  className="input"
                  value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                  required
                >
                  <option value="">Select team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!teams.length && <Hint>No teams exist yet — ask an administrator to create one first.</Hint>}
              <Field label="Hourly rate" hint="bills submitted hours on milestone invoices">
                <input
                  className="input tabular"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                />
              </Field>
              <Field label="Temporary password" hint="min. 8 characters">
                <input
                  className="input"
                  type="password"
                  minLength={8}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </Field>
              <button className="btn-primary w-full" disabled={!teams.length}>
                Onboard worker
              </button>
            </form>
          </Card>
        </Aside>
      )}
    </div>
  );
}

// ── Assignments ─────────────────────────────────────────────────────────────

/** MVP 2: a Team Assignment — owned by a team, billed against a contract. Any active worker on that team may later log hours against it. MVP 3 adds an optional milestone budget (Soft Cap Rule) and a completion action that auto-invoices. */
const ASSIGNMENT_STATUS_OPTIONS = statusOptions(['ACTIVE', 'COMPLETED', 'CANCELLED']);

export function AssignmentsView({ user }: { user: User }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [pms, setPms] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState<Assignment | null>(null);
  const [closePm, setClosePm] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const initial = { team_id: '', contract_id: '', title: '', description: '', start_date: '', end_date: '', allocated_hours: '' };
  const [form, setForm] = useState(initial);

  const load = () => workforceApi.assignments().then(setItems).catch((e) => setError(err(e)));
  useEffect(() => {
    load();
    if (user.role === 'manager') {
      workforceApi.teams().then(setTeams).catch((e) => setError(err(e)));
      workforceApi.contracts().then(setContracts).catch((e) => setError(err(e)));
      authApi.listUsers('PROJECT_MANAGER').then((x: User[]) => setPms(x)).catch((e) => setError(err(e)));
    }
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.createAssignment(form);
      setForm(initial);
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  async function complete() {
    if (!closing) return;
    const target = closing;
    const pm = closePm;
    setClosing(null);
    setClosePm('');
    try {
      await workforceApi.updateAssignmentStatus(target.id, 'COMPLETED', pm ? Number(pm) : undefined);
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  const canCreate = teams.length > 0 && contracts.length > 0;
  const heading =
    user.role === 'worker' ? 'My team’s assignments' : user.role === 'manager' ? 'Team assignments' : 'All assignments';

  const teamOptions = useMemo(() => distinctOptions(items, (a) => a.team_name), [items]);
  const contractOptions = useMemo(() => distinctOptions(items, (a) => a.contract_project_name), [items]);
  const filtered = useMemo(
    () =>
      items.filter(
        (a) =>
          matchesQuery(q, a.title, a.description, a.contract_project_name, a.team_name, a.manager_name) &&
          (!statusFilter || a.status === statusFilter) &&
          (!teamFilter || a.team_name === teamFilter) &&
          (!contractFilter || a.contract_project_name === contractFilter),
      ),
    [items, q, statusFilter, teamFilter, contractFilter],
  );
  const filtersActive = q || statusFilter || teamFilter || contractFilter;
  const clearAll = () => {
    setQ('');
    setStatusFilter('');
    setTeamFilter('');
    setContractFilter('');
  };

  return (
    <div className={`grid gap-6 ${user.role === 'manager' ? 'xl:grid-cols-[1fr_400px]' : ''}`}>
      <Card>
        <SectionHead
          eyebrow="Delivery"
          title={heading}
          note="Work is owned by a team and billed to a contract. A milestone budget, where set, is what the soft-cap rule measures against."
          action={
            <span className="chip tabular">
              {filtersActive ? `${filtered.length} of ${items.length}` : `${items.length} total`}
            </span>
          }
        />
        {items.length > 0 && (
          <FilterBar>
            <SearchField value={q} onChange={setQ} placeholder="Search assignments…" />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={ASSIGNMENT_STATUS_OPTIONS}
              placeholder="All statuses"
            />
            {teamOptions.length > 1 && (
              <FilterSelect value={teamFilter} onChange={setTeamFilter} options={teamOptions} placeholder="All teams" />
            )}
            {contractOptions.length > 1 && (
              <FilterSelect
                value={contractFilter}
                onChange={setContractFilter}
                options={contractOptions}
                placeholder="All contracts"
              />
            )}
            {filtersActive && <ClearFilters onClick={clearAll} />}
          </FilterBar>
        )}
        <ErrorNote text={error} />
        {filtered.length ? (
          <div className="stagger grid gap-4 md:grid-cols-2">
            {filtered.map((a) => (
              <article key={a.id} className="panel panel-hover flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold leading-snug text-ink-900">{a.title}</h3>
                  <Tag status={a.status} />
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-ink-500">
                  {a.description || 'No description provided.'}
                </p>
                <div className="mt-4 border-t border-ink-100 pt-3">
                  <Row label="Contract">{a.contract_project_name}</Row>
                  <Row label="Team">{a.team_name}</Row>
                  <Row label="Manager">{a.manager_name}</Row>
                  <Row label="Window">
                    <span className="text-xs">
                      {day(a.start_date)} → {a.end_date ? day(a.end_date) : 'open'}
                    </span>
                  </Row>
                  {a.allocated_hours != null && <Row label="Milestone budget">{a.allocated_hours} h</Row>}
                </div>
                {user.role === 'manager' && a.status === 'ACTIVE' && (
                  <div className="mt-4 flex justify-end border-t border-ink-100 pt-4">
                    <button
                      onClick={() => {
                        setClosing(a);
                        setClosePm('');
                      }}
                      className="btn-ghost btn-sm"
                    >
                      <CheckCheck size={14} />
                      Complete &amp; invoice
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : items.length ? (
          <EmptyState title="No assignments match those filters" note="Try clearing a filter or broadening your search." />
        ) : (
          <EmptyState title="No assignments yet" note="A delivery manager opens assignments against a contract." />
        )}
      </Card>

      {user.role === 'manager' && (
        <Aside>
          <Card>
            <SectionHead eyebrow="New" title="Create an assignment" />
            <form onSubmit={create} className="space-y-4">
              <ErrorNote text={error} />
              <Field label="Team">
                <select
                  className="input"
                  value={form.team_id}
                  onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                  required
                >
                  <option value="">Select your team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bills against">
                <select
                  className="input"
                  value={form.contract_id}
                  onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
                  required
                >
                  <option value="">Select contract</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.project_name}
                    </option>
                  ))}
                </select>
              </Field>
              {!canCreate && (
                <Hint>
                  {!teams.length
                    ? 'You do not manage any team yet.'
                    : 'No contracts exist yet — ask an administrator to create one first.'}
                </Hint>
              )}
              <Field label="Title">
                <input
                  className="input"
                  placeholder="e.g. Q3 platform migration"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </Field>
              <Field label="Description" hint="optional">
                <textarea
                  className="input"
                  placeholder="Scope of the work"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <input
                    className="input"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label="End date" hint="optional">
                  <input
                    className="input"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Milestone budget" hint="hours — the soft cap flags anything over">
                <input
                  className="input tabular"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="80"
                  value={form.allocated_hours}
                  onChange={(e) => setForm({ ...form, allocated_hours: e.target.value })}
                />
              </Field>
              <button className="btn-primary w-full" disabled={!canCreate}>
                Create assignment
              </button>
            </form>
          </Card>
        </Aside>
      )}

      <Modal
        open={!!closing}
        onClose={() => setClosing(null)}
        title="Complete this assignment"
        note={`“${closing?.title ?? ''}” will be closed. Route the auto-generated invoice to a project manager, or leave it unassigned to close without billing.`}
      >
        <div className="space-y-5">
          <Field label="Route invoice to" hint="optional">
            <select className="input" value={closePm} onChange={(e) => setClosePm(e.target.value)}>
              <option value="">Complete without invoicing</option>
              {pms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setClosing(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={complete}>
              <CheckCheck size={15} />
              Complete assignment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Timesheets ──────────────────────────────────────────────────────────────

const iso = (d: Date) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const monday = () => {
  const d = new Date();
  const wd = d.getDay();
  d.setDate(d.getDate() - (wd === 0 ? 6 : wd - 1));
  return iso(d);
};
const weekEntries = (start: string): Entry[] => {
  if (!start) return [];
  const base = new Date(start + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return { work_date: iso(d), hours: 0 };
  });
};
const weekday = (isoDate: string) =>
  new Date(isoDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });

const TIMESHEET_STATUS_OPTIONS = statusOptions(['DRAFT', 'SUBMITTED', 'NEEDS_REVIEW']);

export function TimesheetsView({ user }: { user: User }) {
  const [sheets, setSheets] = useState<Timesheet[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState('');
  const [ask, confirmUi] = useConfirm();
  const [assignmentId, setAssignmentId] = useState('');
  const [weekStart, setWeekStart] = useState(monday());
  const [entries, setEntries] = useState<Entry[]>(weekEntries(monday()));
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('');

  const load = () => workforceApi.timesheets().then(setSheets).catch((e) => setError(err(e)));
  useEffect(() => {
    load();
    if (user.role === 'worker')
      workforceApi.assignments().then(setAssignments).catch((e) => setError(err(e)));
  }, []);

  const total = entries.reduce((sum, x) => sum + Number(x.hours), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.createTimesheet({ assignment_id: Number(assignmentId), week_start: weekStart, entries });
      setAssignmentId('');
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function saveDraft(sheet: Timesheet) {
    try {
      await workforceApi.updateTimesheet(sheet.id, sheet.entries);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  function editDraft(sheetId: number, index: number, hours: number) {
    setSheets(
      sheets.map((sheet) =>
        sheet.id === sheetId
          ? {
              ...sheet,
              entries: sheet.entries.map((entry, i) => (i === index ? { ...entry, hours } : entry)),
              total_hours: sheet.entries.reduce((sum, entry, i) => sum + (i === index ? hours : Number(entry.hours)), 0),
            }
          : sheet,
      ),
    );
  }
  async function submit(id: number) {
    try {
      await workforceApi.submitTimesheet(id);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function review(id: number, approveOverage: boolean) {
    try {
      await workforceApi.reviewTimesheet(id, approveOverage);
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  const heading =
    user.role === 'worker' ? 'My weekly hours' : user.role === 'manager' ? 'Team timesheets' : 'Organisation timesheets';
  const note =
    user.role === 'manager'
      ? 'A week marked “needs review” pushed the team past its assignment’s milestone budget. Approve the overage, or cap the billable hours at the budget.'
      : 'Hours are logged by week and become read-only once submitted. There is no approval queue beyond the soft-cap rule.';

  const assignmentOptions = useMemo(() => distinctOptions(sheets, (s) => s.assignment_title), [sheets]);
  const filtered = useMemo(
    () =>
      sheets.filter(
        (s) =>
          matchesQuery(q, s.worker_name, s.assignment_title) &&
          (!statusFilter || s.status === statusFilter) &&
          (!assignmentFilter || s.assignment_title === assignmentFilter),
      ),
    [sheets, q, statusFilter, assignmentFilter],
  );
  const filtersActive = q || statusFilter || assignmentFilter;
  const clearAll = () => {
    setQ('');
    setStatusFilter('');
    setAssignmentFilter('');
  };

  return (
    <div className={`grid gap-6 ${user.role === 'worker' ? 'xl:grid-cols-[1fr_400px]' : ''}`}>
      {confirmUi}
      <Card>
        <SectionHead
          eyebrow="Time"
          title={heading}
          note={note}
          action={
            <span className="chip tabular">
              {filtersActive ? `${filtered.length} of ${sheets.length}` : `${sheets.length} weeks`}
            </span>
          }
        />
        {sheets.length > 0 && (
          <FilterBar>
            {user.role !== 'worker' && <SearchField value={q} onChange={setQ} placeholder="Search by worker…" />}
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={TIMESHEET_STATUS_OPTIONS}
              placeholder="All statuses"
            />
            {assignmentOptions.length > 1 && (
              <FilterSelect
                value={assignmentFilter}
                onChange={setAssignmentFilter}
                options={assignmentOptions}
                placeholder="All assignments"
              />
            )}
            {filtersActive && <ClearFilters onClick={clearAll} />}
          </FilterBar>
        )}
        <ErrorNote text={error} />
        {filtered.length ? (
          <div className="stagger space-y-4">
            {filtered.map((s) => {
              const flagged = s.status === 'NEEDS_REVIEW';
              const peak = Math.max(1, ...s.entries.map((x) => Number(x.hours)));
              return (
                <article
                  key={s.id}
                  className={`rounded-2xl border p-5 transition-colors duration-300 ${
                    flagged ? 'border-honey/30 bg-honey-soft/50' : 'border-ink-200/70 bg-white hover:border-ink-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.worker_name} size={34} />
                      <div>
                        <h3 className="text-[15px] font-medium text-ink-900">{s.worker_name}</h3>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {s.assignment_title} · {day(s.week_start)} → {day(s.week_end)}
                        </p>
                      </div>
                    </div>
                    <Tag status={s.status} />
                  </div>

                  <div className="mt-5 grid grid-cols-7 gap-2">
                    {s.entries.map((x, i) => {
                      const editable = user.role === 'worker' && s.status === 'DRAFT';
                      return (
                        <div
                          key={x.work_date}
                          className="rounded-xl border border-ink-100 bg-ink-50/60 p-2.5 text-center transition-colors duration-200 hover:border-ink-200"
                        >
                          <div className="text-2xs font-medium tracking-normal text-ink-400">{weekday(x.work_date)}</div>
                          {editable ? (
                            <input
                              className="mt-1.5 w-full rounded-lg border border-ink-200 bg-white py-1 text-center text-sm font-semibold tabular text-ink-900 outline-none transition-shadow focus:border-pine-400 focus:shadow-[0_0_0_3px_var(--ring)]"
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={x.hours}
                              onChange={(e) => editDraft(s.id, i, Number(e.target.value))}
                            />
                          ) : (
                            <div className="mt-1.5 text-base font-semibold tabular text-ink-900">{x.hours}</div>
                          )}
                          <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-ink-200/70">
                            <div
                              className="h-full rounded-full bg-pine-500/70 transition-[width] duration-500 ease-smooth"
                              style={{ width: `${(Number(x.hours) / peak) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                    <p className="text-sm text-ink-600">
                      <span className="display text-xl tabular text-ink-900">{s.total_hours}</span> hours logged
                      {s.billable_hours !== s.total_hours && (
                        <span className="ml-2 text-pine-600">· {s.billable_hours} billable</span>
                      )}
                    </p>
                    {user.role === 'worker' && s.status === 'DRAFT' && (
                      <div className="flex gap-2">
                        <button onClick={() => saveDraft(s)} className="btn-ghost btn-sm">
                          Save changes
                        </button>
                        <button
                          onClick={() =>
                            ask({
                              title: 'Submit this week?',
                              note: 'Once submitted the week becomes read-only and is eligible for billing.',
                              confirmLabel: 'Submit week',
                              onConfirm: () => submit(s.id),
                            })
                          }
                          className="btn-primary btn-sm"
                        >
                          <Send size={13} />
                          Submit
                        </button>
                      </div>
                    )}
                  </div>

                  {user.role === 'manager' && flagged && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-honey/25 bg-white/70 p-4">
                      <p className="max-w-sm text-xs leading-relaxed text-ink-600">
                        This week exceeds the assignment’s milestone budget. Choose what becomes billable.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => review(s.id, false)} className="btn-ghost btn-sm">
                          Cap at budget
                        </button>
                        <button onClick={() => review(s.id, true)} className="btn-primary btn-sm">
                          Approve overage
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : sheets.length ? (
          <EmptyState title="No weeks match those filters" note="Try clearing a filter or broadening your search." />
        ) : (
          <EmptyState title="No timesheets yet" note="Weeks appear here as team members log their hours." />
        )}
      </Card>

      {user.role === 'worker' && (
        <Aside>
          <Card>
            <SectionHead eyebrow="New" title="Log a week" />
            <form onSubmit={save} className="space-y-4">
              <ErrorNote text={error} />
              <Field label="Assignment">
                <select
                  className="input"
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value)}
                  required
                >
                  <option value="">Select assignment</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </Field>
              {!assignments.length && (
                <Hint>No assignments on your team yet — ask your manager to open one.</Hint>
              )}
              <Field label="Week starting" hint="Monday">
                <input
                  className="input"
                  type="date"
                  value={weekStart}
                  onChange={(e) => {
                    setWeekStart(e.target.value);
                    setEntries(weekEntries(e.target.value));
                  }}
                  required
                />
              </Field>
              <div className="space-y-1.5 rounded-2xl border border-ink-200/70 bg-ink-50/50 p-3">
                {entries.map((x, i) => (
                  <label
                    key={x.work_date}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-white"
                  >
                    <span className="text-ink-600">
                      {new Date(x.work_date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long' })}
                    </span>
                    <input
                      className="w-20 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-right text-sm tabular outline-none transition-shadow focus:border-pine-400 focus:shadow-[0_0_0_3px_var(--ring)]"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={x.hours}
                      onChange={(e) =>
                        setEntries(entries.map((v, j) => (j === i ? { ...v, hours: Number(e.target.value) } : v)))
                      }
                    />
                  </label>
                ))}
                <div className="flex items-center justify-between border-t border-ink-200 px-2 pt-3 text-sm">
                  <span className="text-2xs font-semibold tracked text-ink-500">Week total</span>
                  <span className="display text-xl tabular text-ink-900">{total} h</span>
                </div>
              </div>
              <button className="btn-primary w-full" disabled={!assignments.length}>
                Save draft
              </button>
            </form>
          </Card>
        </Aside>
      )}
    </div>
  );
}

// ── Contracts ───────────────────────────────────────────────────────────────

export function ContractsView({ user }: { user: User }) {
  const [items, setItems] = useState<Contract[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const initial = { project_name: '', start_date: '', duration_in_months: '12', manager_id: '' };
  const [form, setForm] = useState(initial);
  const [q, setQ] = useState('');
  const [managerFilter, setManagerFilter] = useState('');

  const load = () => workforceApi.contracts().then(setItems).catch((e) => setError(err(e)));
  // Only an admin may create a contract, so only an admin needs the manager picker.
  useEffect(() => {
    load();
    if (user.role === 'admin')
      authApi.listUsers('MANAGER').then((x: User[]) => setManagers(x)).catch((e) => setError(err(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.createContract(form);
      setForm(initial);
      load();
    } catch (e) {
      setError(err(e));
    }
  }

  const managerOptions = useMemo(() => distinctOptions(items, (c) => c.manager_name), [items]);
  const filtered = useMemo(
    () =>
      items.filter(
        (c) => matchesQuery(q, c.project_name, c.manager_name) && (!managerFilter || c.manager_name === managerFilter),
      ),
    [items, q, managerFilter],
  );
  const filtersActive = q || managerFilter;

  return (
    <div className={`grid gap-6 ${user.role === 'admin' ? 'xl:grid-cols-[1fr_380px]' : ''}`}>
      <Card>
        <SectionHead
          eyebrow="Commercial"
          title={user.role === 'manager' ? 'My contracts' : 'All contracts'}
          note="The agreements assignments bill against. Every invoice traces back to one of these."
          action={
            <span className="chip tabular">
              {filtersActive ? `${filtered.length} of ${items.length}` : `${items.length} total`}
            </span>
          }
        />
        {items.length > 0 && (
          <FilterBar>
            <SearchField value={q} onChange={setQ} placeholder="Search contracts…" />
            {managerOptions.length > 1 && (
              <FilterSelect
                value={managerFilter}
                onChange={setManagerFilter}
                options={managerOptions}
                placeholder="All managers"
              />
            )}
            {filtersActive && <ClearFilters onClick={() => { setQ(''); setManagerFilter(''); }} />}
          </FilterBar>
        )}
        <ErrorNote text={error} />
        {filtered.length ? (
          <div className="stagger grid gap-4 md:grid-cols-2">
            {filtered.map((c) => (
              <article key={c.id} className="panel panel-hover group relative overflow-hidden">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-pine-50 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-semibold leading-snug text-ink-900">{c.project_name}</h3>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-400 transition-colors duration-500 group-hover:bg-white group-hover:text-pine-600">
                      <FileText size={15} strokeWidth={1.75} />
                    </span>
                  </div>
                  <div className="mt-4 border-t border-ink-100 pt-3">
                    <Row label="Manager">{c.manager_name}</Row>
                    <Row label="Term">{c.duration_in_months} months</Row>
                    <Row label="Window">
                      <span className="text-xs">
                        {day(c.start_date)} → {day(c.end_date)}
                      </span>
                    </Row>
                    <Row label="Raised by">{c.created_by_admin_name}</Row>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : items.length ? (
          <EmptyState title="No contracts match those filters" note="Try clearing a filter or broadening your search." />
        ) : (
          <EmptyState title="No contracts yet" note="An administrator records the commercial agreement before work is assigned." />
        )}
      </Card>

      {user.role === 'admin' && (
        <Aside>
          <Card className="overflow-hidden !p-0">
            <div className="photo-scrim relative h-32 bg-pine-900">
              <Photo src={imagery.contracts} alt="" className="h-full w-full object-cover opacity-50" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                <p className="eyebrow text-pine-200">New</p>
                <h2 className="display mt-1 text-2xl text-white">Record a contract</h2>
              </div>
            </div>
            <form onSubmit={create} className="space-y-4 p-7">
              <ErrorNote text={error} />
              <Field label="Project name">
                <input
                  className="input"
                  placeholder="e.g. Northwind Data Platform"
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <input
                    className="input"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Months">
                  <input
                    className="input tabular"
                    type="number"
                    min="1"
                    max="120"
                    value={form.duration_in_months}
                    onChange={(e) => setForm({ ...form, duration_in_months: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <Field label="Accountable manager">
                <select
                  className="input"
                  value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  required
                >
                  <option value="">Select manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!managers.length && <Hint>No managers exist yet — onboard a MANAGER-role user first.</Hint>}
              <button className="btn-primary w-full" disabled={!managers.length}>
                Create contract
              </button>
            </form>
          </Card>
        </Aside>
      )}
    </div>
  );
}

// ── Invoices ────────────────────────────────────────────────────────────────

const INVOICE_STATUS_OPTIONS = statusOptions(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']);

export function InvoicesView({ user }: { user: User }) {
  const [items, setItems] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [pms, setPms] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [ask, confirmUi] = useConfirm();
  const [rejecting, setRejecting] = useState<Invoice | null>(null);
  const [reason, setReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const genInitial = { contract_id: '', project_manager_id: '' };
  const [genForm, setGenForm] = useState(genInitial);
  const initial = { contract_id: '', project_manager_id: '', period_start: '', period_end: '', amount: '', notes: '' };
  const [form, setForm] = useState(initial);

  const load = () => workforceApi.invoices().then(setItems).catch((e) => setError(err(e)));
  // Only a manager raises invoices, so only a manager needs the contract/PM pickers.
  useEffect(() => {
    load();
    if (user.role === 'manager') {
      workforceApi.contracts().then(setContracts).catch((e) => setError(err(e)));
      authApi.listUsers('PROJECT_MANAGER').then((x: User[]) => setPms(x)).catch((e) => setError(err(e)));
    }
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.generateInvoice(genForm);
      setGenForm(genInitial);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await workforceApi.createInvoice(form);
      setForm(initial);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function submit(id: number) {
    try {
      await workforceApi.submitInvoice(id);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function approve(id: number) {
    try {
      await workforceApi.approveInvoice(id);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function reject() {
    if (!rejecting || !reason.trim()) return;
    const id = rejecting.id;
    const text = reason;
    setRejecting(null);
    setReason('');
    try {
      await workforceApi.rejectInvoice(id, text);
      load();
    } catch (e) {
      setError(err(e));
    }
  }
  async function downloadPdf(id: number) {
    try {
      await workforceApi.downloadInvoicePdf(id);
    } catch (e) {
      setError(err(e));
    }
  }

  const canRaise = contracts.length > 0 && pms.length > 0;
  const heading =
    user.role === 'manager'
      ? 'Invoices I raised'
      : user.role === 'project_manager'
        ? 'Awaiting my decision'
        : 'All invoices';
  const outstanding = items
    .filter((i) => i.status === 'PENDING_APPROVAL')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const contractOptions = useMemo(() => distinctOptions(items, (i) => i.contract_project_name), [items]);
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!statusFilter || i.status === statusFilter) &&
          (!contractFilter || i.contract_project_name === contractFilter),
      ),
    [items, statusFilter, contractFilter],
  );
  const filtersActive = statusFilter || contractFilter;

  return (
    <div className={`grid gap-6 ${user.role === 'manager' ? 'xl:grid-cols-[1fr_400px]' : ''}`}>
      {confirmUi}
      <Card>
        <SectionHead
          eyebrow="Billing"
          title={heading}
          note="Each invoice carries the contract, the period it covers and the decision made on it."
          action={
            filtersActive ? (
              <span className="chip tabular">
                {filtered.length} of {items.length}
              </span>
            ) : outstanding > 0 ? (
              <span className="chip tabular">{money(outstanding)} awaiting decision</span>
            ) : (
              <span className="chip tabular">{items.length} total</span>
            )
          }
        />
        {items.length > 0 && (
          <FilterBar>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={INVOICE_STATUS_OPTIONS}
              placeholder="All statuses"
            />
            {contractOptions.length > 1 && (
              <FilterSelect
                value={contractFilter}
                onChange={setContractFilter}
                options={contractOptions}
                placeholder="All contracts"
              />
            )}
            {filtersActive && (
              <ClearFilters
                onClick={() => {
                  setStatusFilter('');
                  setContractFilter('');
                }}
              />
            )}
          </FilterBar>
        )}
        <ErrorNote text={error} />
        {filtered.length ? (
          <div className="stagger space-y-4">
            {filtered.map((i) => (
              <article
                key={i.id}
                className="rounded-2xl border border-ink-200/70 bg-white p-5 transition-[border-color,box-shadow] duration-300 hover:border-ink-300 hover:shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-[15px] font-semibold text-ink-900">{i.contract_project_name}</h3>
                      <Tag status={i.status} />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400">
                      <CalendarRange size={13} />
                      {day(i.period_start)} → {day(i.period_end)}
                    </p>
                  </div>
                  <p className="display text-3xl tabular text-ink-900">{money(i.amount)}</p>
                </div>

                <div className="mt-4 grid gap-x-10 border-t border-ink-100 pt-3 sm:grid-cols-2">
                  <Row label="Raised by">{i.manager_name}</Row>
                  <Row label="Project manager">{i.project_manager_name}</Row>
                  {i.notes && <Row label="Notes">{i.notes}</Row>}
                  {i.decision_notes && <Row label="Decision">{i.decision_notes}</Row>}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 pt-4">
                  <button onClick={() => downloadPdf(i.id)} className="btn-quiet btn-sm">
                    <Download size={13} />
                    PDF
                  </button>
                  {user.role === 'manager' && i.status === 'DRAFT' && (
                    <button
                      onClick={() =>
                        ask({
                          title: 'Submit for approval?',
                          note: `${money(i.amount)} on ${i.contract_project_name} will go to ${i.project_manager_name} for a decision.`,
                          confirmLabel: 'Submit invoice',
                          onConfirm: () => submit(i.id),
                        })
                      }
                      className="btn-primary btn-sm"
                    >
                      <ArrowUpRight size={13} />
                      Submit for approval
                    </button>
                  )}
                  {user.role === 'project_manager' && i.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => {
                          setRejecting(i);
                          setReason('');
                        }}
                        className="btn-danger btn-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() =>
                          ask({
                            title: 'Approve this invoice?',
                            note: `${money(i.amount)} on ${i.contract_project_name}, raised by ${i.manager_name}.`,
                            confirmLabel: 'Approve',
                            onConfirm: () => approve(i.id),
                          })
                        }
                        className="btn-primary btn-sm"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : items.length ? (
          <EmptyState title="No invoices match those filters" note="Try clearing a filter." />
        ) : (
          <EmptyState title="No invoices yet" note="Billing appears here once a manager raises it against a contract." />
        )}
      </Card>

      {user.role === 'manager' && (
        <Aside>
          <div className="space-y-6">
            <Card>
              <SectionHead
                eyebrow="Automatic"
                title="Milestone billing"
                note="Bills every submitted timesheet on the contract — hours × each worker’s own rate — straight into the project manager’s queue."
              />
              <form onSubmit={generate} className="space-y-4">
                <ErrorNote text={error} />
                <Field label="Contract">
                  <select
                    className="input"
                    value={genForm.contract_id}
                    onChange={(e) => setGenForm({ ...genForm, contract_id: e.target.value })}
                    required
                  >
                    <option value="">Select contract</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.project_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Approver">
                  <select
                    className="input"
                    value={genForm.project_manager_id}
                    onChange={(e) => setGenForm({ ...genForm, project_manager_id: e.target.value })}
                    required
                  >
                    <option value="">Select project manager</option>
                    {pms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {!canRaise && (
                  <Hint>
                    {!contracts.length
                      ? 'None of your contracts exist yet.'
                      : 'No project managers exist yet — ask an administrator to onboard one.'}
                  </Hint>
                )}
                <button className="btn-primary w-full" disabled={!canRaise}>
                  <Sparkles size={15} />
                  Generate &amp; submit
                </button>
              </form>
            </Card>

            <Card>
              <SectionHead eyebrow="Manual" title="Raise an invoice" />
              <form onSubmit={create} className="space-y-4">
                <Field label="Contract">
                  <select
                    className="input"
                    value={form.contract_id}
                    onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
                    required
                  >
                    <option value="">Select contract</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.project_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Approver">
                  <select
                    className="input"
                    value={form.project_manager_id}
                    onChange={(e) => setForm({ ...form, project_manager_id: e.target.value })}
                    required
                  >
                    <option value="">Select project manager</option>
                    {pms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Period start">
                    <input
                      className="input"
                      type="date"
                      value={form.period_start}
                      onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Period end">
                    <input
                      className="input"
                      type="date"
                      value={form.period_end}
                      onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <Field label="Amount" hint="₹">
                  <input
                    className="input tabular"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Notes" hint="optional">
                  <textarea
                    className="input"
                    placeholder="What this invoice covers"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Field>
                <button className="btn-ghost w-full" disabled={!canRaise}>
                  Save as draft
                </button>
              </form>
            </Card>
          </div>
        </Aside>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this invoice"
        note={
          rejecting
            ? `${money(rejecting.amount)} on ${rejecting.contract_project_name}. The manager sees your reason.`
            : undefined
        }
      >
        <div className="space-y-5">
          <Field label="Reason">
            <textarea
              className="input"
              autoFocus
              placeholder="e.g. Hours for week 32 are not yet approved."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setRejecting(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary !bg-clay hover:!bg-[#8E3626]"
              onClick={reject}
              disabled={!reason.trim()}
            >
              Reject invoice
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
