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
export interface Worker { id:number; user_id:number|null; team_id:number; team_name:string; name:string; email:string; employee_code:string; worker_type:string; employment_start_date:string; status:'ACTIVE'|'INACTIVE'|'OFFBOARDED' }
export interface Assignment { id:number; worker_id:number; worker_name:string; team_id:number; team_name:string; manager_id:number; manager_name:string; title:string; description:string; start_date:string; end_date:string; status:string }
export interface Entry { work_date:string; hours:number }
export interface Timesheet { id:number; worker_id:number; worker_name:string; assignment_id:number; assignment_title:string; week_start:string; week_end:string; status:'DRAFT'|'SUBMITTED'; total_hours:number; submitted_at:string|null; entries:Entry[] }

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
  status: w.status,
});

const mapAssignment = (a: any): Assignment => ({
  id: a.id,
  worker_id: a.workerId,
  worker_name: a.workerName,
  team_id: a.teamId,
  team_name: a.teamName,
  manager_id: a.managerId,
  manager_name: a.managerName,
  title: a.title,
  description: a.description ?? '',
  start_date: a.startDate,
  end_date: a.endDate ?? 'Open-ended',
  status: a.status,
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
  submitted_at: t.status === 'SUBMITTED' ? t.updatedAt ?? null : null,
  entries: padWeek(
    t.weekStartDate,
    (t.entries ?? []).map((e: any) => ({ work_date: e.workDate, hours: Number(e.hours) }))
  ),
});

const toEntryPayload = (entries: Entry[]) =>
  entries.map((e) => ({ workDate: e.work_date, hours: Number(e.hours) }));

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
      })
      .then((r) => r.data),

  updateWorker: (id: number, data: any) =>
    api
      .patch(`/api/workers/${id}`, {
        name: data.name,
        workerType: data.worker_type,
        teamId: data.team_id ? Number(data.team_id) : undefined,
        status: data.status,
      })
      .then((r) => r.data),

  offboard: (id: number) => api.post(`/api/workers/${id}/offboard`, {}).then((r) => r.data),

  /** A worker sees only their own; everyone else gets a scoped list. */
  assignments: (params?: any) =>
    api
      .get(role() === 'worker' ? '/api/assignments/my' : '/api/assignments', {
        params: { ...PAGE, ...params },
      })
      .then((r) => unwrap(r).map(mapAssignment)),

  createAssignment: (data: any) =>
    api
      .post('/api/assignments', {
        workerId: Number(data.worker_id),
        // teamId is omitted: the backend defaults it to the worker's own team.
        title: data.title,
        description: data.description || null,
        startDate: data.start_date,
        endDate: data.end_date || null,
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
};
