import api, { UiRole } from './client';
import { useAuthStore } from '../store/authStore';

/*
 * Translation layer between the Spring Boot API and the UI.
 *
 * The API speaks camelCase, returns paginated envelopes, and splits several
 * reads by role (a worker has /my, a manager has a team-scoped list). The UI
 * is written against flat snake_case arrays. Every one of those differences is
 * absorbed here, so the view components stay unchanged.
 */

export type Role = UiRole;
export interface User { id:number; name:string; email:string; role:Role; is_active:boolean }
export interface Team { id:number; name:string; description:string; manager_id:number; manager_name:string }
export interface Worker { id:number; user_id:number|null; team_id:number; team_name:string; name:string; email:string; employee_code:string; worker_type:string; employment_start_date:string; hourly_rate:number; status:'ACTIVE'|'INACTIVE'|'OFFBOARDED' }
/** MVP 2: a Team Assignment — owned by a team and billed against a contract, not one named worker. MVP 3 adds an optional milestone budget. */
export interface Assignment { id:number; team_id:number; team_name:string; contract_id:number; contract_project_name:string; manager_id:number; manager_name:string; title:string; description:string; start_date:string; end_date:string; status:string; allocated_hours:number|null }
export interface Entry { work_date:string; hours:number }
/** MVP 3: NEEDS_REVIEW is the Soft Cap Rule detour — a submission over the assignment's budget lands here for a manager to resolve. billable_hours is what Milestone Billing will actually charge for. */
export interface Timesheet { id:number; worker_id:number; worker_name:string; assignment_id:number; assignment_title:string; week_start:string; week_end:string; status:'DRAFT'|'SUBMITTED'|'NEEDS_REVIEW'; total_hours:number; billable_hours:number; submitted_at:string|null; entries:Entry[] }
export interface Contract { id:number; project_name:string; start_date:string; end_date:string; duration_in_months:number; manager_id:number; manager_name:string; created_by_admin_id:number; created_by_admin_name:string }
export type InvoiceStatus = 'DRAFT'|'PENDING_APPROVAL'|'APPROVED'|'REJECTED';
export interface Invoice { id:number; contract_id:number; contract_project_name:string; manager_id:number; manager_name:string; project_manager_id:number; project_manager_name:string; period_start:string; period_end:string; amount:number; notes:string|null; decision_notes:string|null; status:InvoiceStatus }

const role = (): Role | undefined => (useAuthStore.getState().user as any)?.role;

/** Collection endpoints return {content:[...]}; tolerate a bare array too. */
const unwrap = (r: any): any[] => (Array.isArray(r.data) ? r.data : r.data?.content ?? []);

/** The UI has no pager yet, so ask for the largest page the API allows. */
const PAGE = { size: 100 };

const isoDate = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/**
 * The API stores only the days that were entered, but the UI renders a fixed
 * Monday-to-Sunday grid and edits entries by index. Padding the week to seven
 * slots keeps those indices meaningful and shows untouched days as zero.
 */
const padWeek = (weekStart: string, entries: Entry[]): Entry[] => {
  if (!weekStart) return entries;
  const hoursByDate = new Map(entries.map((e) => [e.work_date, e.hours]));
  const base = new Date(weekStart + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    const date = isoDate(day);
    return { work_date: date, hours: hoursByDate.get(date) ?? 0 };
  });
};

// ── Response mappers ─────────────────────────────────────────────────────────

const mapTeam = (t: any): Team => ({
  id: t.id,
  name: t.name,
  description: t.description ?? '',
  manager_id: t.managerId,
  manager_name: t.managerName,
});

const mapWorker = (w: any): Worker => ({
  id: w.id,
  user_id: w.userId ?? null,
  team_id: w.teamId,
  team_name: w.teamName ?? 'Unassigned',
  name: w.name,
  email: w.email,
  employee_code: w.employeeCode,
  worker_type: w.workerType,
  employment_start_date: w.employmentStartDate,
  hourly_rate: Number(w.hourlyRate ?? 0),
  status: w.status,
});

const mapAssignment = (a: any): Assignment => ({
  id: a.id,
  team_id: a.teamId,
  team_name: a.teamName,
  contract_id: a.contractId,
  contract_project_name: a.contractProjectName,
  manager_id: a.managerId,
  manager_name: a.managerName,
  title: a.title,
  description: a.description ?? '',
  start_date: a.startDate,
  end_date: a.endDate ?? 'Open-ended',
  status: a.status,
  allocated_hours: a.allocatedHours !== undefined && a.allocatedHours !== null ? Number(a.allocatedHours) : null,
});

const mapTimesheet = (t: any): Timesheet => ({
  id: t.id,
  worker_id: t.workerId,
  worker_name: t.workerName,
  assignment_id: t.assignmentId,
  assignment_title: t.assignmentTitle,
  week_start: t.weekStartDate,
  week_end: t.weekEndDate,
  status: t.status,
  // Always the server's figure — the UI never decides the total.
  total_hours: Number(t.totalHours ?? 0),
  billable_hours: Number(t.billableHours ?? t.totalHours ?? 0),
  submitted_at: t.status === 'SUBMITTED' ? t.updatedAt ?? null : null,
  entries: padWeek(
    t.weekStartDate,
    (t.entries ?? []).map((e: any) => ({ work_date: e.workDate, hours: Number(e.hours) }))
  ),
});

const toEntryPayload = (entries: Entry[]) =>
  entries.map((e) => ({ workDate: e.work_date, hours: Number(e.hours) }));

const mapContract = (c: any): Contract => ({
  id: c.id,
  project_name: c.projectName,
  start_date: c.startDate,
  end_date: c.endDate,
  duration_in_months: c.durationInMonths,
  manager_id: c.managerId,
  manager_name: c.managerName,
  created_by_admin_id: c.createdByAdminId,
  created_by_admin_name: c.createdByAdminName,
});

const mapInvoice = (i: any): Invoice => ({
  id: i.id,
  contract_id: i.contractId,
  contract_project_name: i.contractProjectName,
  manager_id: i.managerId,
  manager_name: i.managerName,
  project_manager_id: i.projectManagerId,
  project_manager_name: i.projectManagerName,
  period_start: i.periodStart,
  period_end: i.periodEnd,
  amount: Number(i.amount),
  notes: i.notes,
  decision_notes: i.decisionNotes,
  status: i.status,
});

// ── API ──────────────────────────────────────────────────────────────────────

export const workforceApi = {
  dashboard: () => api.get('/api/dashboard/summary').then((r) => r.data),

  teams: () => api.get('/api/teams', { params: PAGE }).then((r) => unwrap(r).map(mapTeam)),

  createTeam: (data: any) =>
    api
      .post('/api/teams', {
        name: data.name,
        description: data.description || null,
        managerId: Number(data.manager_id),
        // code is omitted deliberately: the backend derives it from the name.
      })
      .then((r) => r.data),

  workers: (params?: any) =>
    api
      .get('/api/workers', { params: { ...PAGE, ...params } })
      .then((r) => unwrap(r).map(mapWorker)),

  onboard: (data: any) =>
    api
      .post('/api/workers', {
        name: data.name,
        email: data.email,
        password: data.password,
        employeeCode: data.employee_code,
        workerType: data.worker_type,
        employmentStartDate: data.employment_start_date,
        teamId: data.team_id ? Number(data.team_id) : null,
        hourlyRate: data.hourly_rate !== undefined && data.hourly_rate !== '' ? Number(data.hourly_rate) : null,
      })
      .then((r) => r.data),

  updateWorker: (id: number, data: any) =>
    api
      .patch(`/api/workers/${id}`, {
        name: data.name || undefined,
        workerType: data.worker_type || undefined,
        teamId: data.team_id ? Number(data.team_id) : undefined,
        status: data.status || undefined,
        hourlyRate: data.hourly_rate !== undefined && data.hourly_rate !== '' ? Number(data.hourly_rate) : undefined,
        employmentStartDate: data.employment_start_date || undefined,
        employmentEndDate: data.employment_end_date || undefined,
      })
      .then((r) => mapWorker(r.data)),

  offboard: (id: number) => api.post(`/api/workers/${id}/offboard`, {}).then((r) => r.data),

  /** A worker sees only their own; everyone else gets a scoped list. */
  assignments: (params?: any) =>
    api
      .get(role() === 'worker' ? '/api/assignments/my' : '/api/assignments', {
        params: { ...PAGE, ...params },
      })
      .then((r) => unwrap(r).map(mapAssignment)),

  /** MVP 2: a Team Assignment names a team and a contract, never a worker. MVP 3 adds an optional milestone budget. */
  createAssignment: (data: any) =>
    api
      .post('/api/assignments', {
        teamId: Number(data.team_id),
        contractId: Number(data.contract_id),
        title: data.title,
        description: data.description || null,
        startDate: data.start_date,
        endDate: data.end_date || null,
        allocatedHours: data.allocated_hours !== undefined && data.allocated_hours !== ''
          ? Number(data.allocated_hours)
          : null,
      })
      .then((r) => r.data),

  /**
   * MVP 3 Automated Handoff: marking an assignment COMPLETED with a project
   * manager named bills every SUBMITTED timesheet on its contract straight to
   * them in the same call — no billable hours yet is not an error, it just
   * skips the invoice.
   */
  updateAssignmentStatus: (id: number, status: string, projectManagerId?: number) =>
    api
      .patch(`/api/assignments/${id}/status`, {
        status,
        projectManagerId: projectManagerId ?? null,
      })
      .then((r) => r.data),

  timesheets: (params?: any) =>
    api
      .get(role() === 'worker' ? '/api/timesheets/my' : '/api/timesheets', {
        params: { ...PAGE, ...params },
      })
      .then((r) => unwrap(r).map(mapTimesheet)),

  createTimesheet: (data: any) =>
    api
      .post('/api/timesheets', {
        assignmentId: Number(data.assignment_id),
        weekStartDate: data.week_start,
        entries: toEntryPayload(data.entries ?? []),
      })
      .then((r) => mapTimesheet(r.data)),

  updateTimesheet: (id: number, entries: Entry[]) =>
    api
      .put(`/api/timesheets/${id}/entries`, { entries: toEntryPayload(entries) })
      .then((r) => mapTimesheet(r.data)),

  submitTimesheet: (id: number) =>
    api.post(`/api/timesheets/${id}/submit`).then((r) => mapTimesheet(r.data)),

  /** MVP 3 Soft Cap Rule: the manager's decision on a NEEDS_REVIEW week. */
  reviewTimesheet: (id: number, approveOverage: boolean) =>
    api.post(`/api/timesheets/${id}/review`, { approveOverage }).then((r) => mapTimesheet(r.data)),

  contracts: () =>
    api.get('/api/contracts', { params: PAGE }).then((r) => unwrap(r).map(mapContract)),

  createContract: (data: any) =>
    api
      .post('/api/contracts', {
        projectName: data.project_name,
        startDate: data.start_date,
        durationInMonths: Number(data.duration_in_months),
        managerId: Number(data.manager_id),
      })
      .then((r) => mapContract(r.data)),

  /** Scoped server-side: admin/HR see the org, a manager only invoices they raised, a project manager only invoices assigned to them. */
  invoices: (params?: any) =>
    api
      .get('/api/invoices', { params: { ...PAGE, ...params } })
      .then((r) => unwrap(r).map(mapInvoice)),

  /** Milestone Billing (T&M): the amount is computed server-side from SUBMITTED timesheets. */
  generateInvoice: (data: any) =>
    api
      .post('/api/invoices/generate', {
        contractId: Number(data.contract_id),
        projectManagerId: Number(data.project_manager_id),
      })
      .then((r) => mapInvoice(r.data)),

  createInvoice: (data: any) =>
    api
      .post('/api/invoices', {
        contractId: Number(data.contract_id),
        projectManagerId: Number(data.project_manager_id),
        periodStart: data.period_start,
        periodEnd: data.period_end,
        amount: Number(data.amount),
        notes: data.notes || null,
      })
      .then((r) => mapInvoice(r.data)),

  submitInvoice: (id: number) =>
    api.post(`/api/invoices/${id}/submit`).then((r) => mapInvoice(r.data)),

  approveInvoice: (id: number, notes?: string) =>
    api.post(`/api/invoices/${id}/approve`, { notes: notes || null }).then((r) => mapInvoice(r.data)),

  rejectInvoice: (id: number, notes: string) =>
    api.post(`/api/invoices/${id}/reject`, { notes }).then((r) => mapInvoice(r.data)),

  /** MVP 3: fetches the formatted invoice PDF and hands the browser a file to save. */
  downloadInvoicePdf: async (id: number) => {
    const res = await api.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
