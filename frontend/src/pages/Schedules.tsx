import { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Briefcase,
  User,
  Plus,
  Lock,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { WorkSchedule, OvertimePolicy } from '../types';

export default function Schedules() {
  const { schedules, employees, projects, currentUser, createSchedule } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    projectId: projects[0]?.id || '',
    weekStartDate: '2026-08-24',
    weekEndDate: '2026-08-28',
    startTime: '09:00',
    endTime: '17:00',
    expectedHours: 8,
    regularRate: 500,
    overtimeRate: 750,
    overtimePolicy: 'DAILY_AFTER_8' as OvertimePolicy,
  });

  const isManager = currentUser.role === 'MANAGER';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === form.employeeId);
    const proj = projects.find((x) => x.id === form.projectId);

    if (!emp || !proj) return;

    createSchedule({
      employeeId: emp.id,
      employeeName: emp.name,
      vendorId: emp.vendorId,
      vendorName: emp.vendorName,
      projectId: proj.id,
      projectName: proj.name,
      weekStartDate: form.weekStartDate,
      weekEndDate: form.weekEndDate,
      dailySchedule: [
        { day: 'Mon', scheduled: true, startTime: form.startTime, endTime: form.endTime, expectedHours: form.expectedHours },
        { day: 'Tue', scheduled: true, startTime: form.startTime, endTime: form.endTime, expectedHours: form.expectedHours },
        { day: 'Wed', scheduled: true, startTime: form.startTime, endTime: form.endTime, expectedHours: form.expectedHours },
        { day: 'Thu', scheduled: true, startTime: form.startTime, endTime: form.endTime, expectedHours: form.expectedHours },
        { day: 'Fri', scheduled: true, startTime: form.startTime, endTime: form.endTime, expectedHours: form.expectedHours },
      ],
      totalExpectedHours: form.expectedHours * 5,
      regularRate: form.regularRate,
      overtimeRate: form.overtimeRate,
      overtimePolicy: form.overtimePolicy,
      createdByManager: currentUser.name,
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="text-blue-600" /> Work Schedules (Expected Plan)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedules establish the baseline expected hours, shift windows, and billing rates. 
            <b className="text-blue-600"> Only Managers can create/edit schedules</b>.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            Create Employee Schedule
          </button>
        )}
      </div>

      {!isManager && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <span>
            <b>Read-Only Notice:</b> You are in <b>{currentUser.role}</b> mode. You can view schedules created by the Project Manager, but only Managers hold authority to modify scheduled baselines.
          </span>
        </div>
      )}

      {/* Schedule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((sch) => (
          <div
            key={sch.id}
            className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {sch.projectName}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">{sch.employeeName}</h3>
                <p className="text-xs text-gray-500">{sch.vendorName}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-gray-900">{sch.totalExpectedHours}h</p>
                <p className="text-[10px] text-gray-400">Weekly Plan</p>
              </div>
            </div>

            {/* Shift Breakdown */}
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between text-gray-600">
                <span>Working Days:</span>
                <span className="font-semibold text-gray-800">Mon – Fri (5 Days)</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shift Window:</span>
                <span className="font-semibold text-gray-800">09:00 AM – 05:00 PM</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Expected Rate:</span>
                <span className="font-semibold text-emerald-700">₹{sch.regularRate}/hr (OT: ₹{sch.overtimeRate}/hr)</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Overtime Policy:</span>
                <span className="font-semibold text-blue-700">{sch.overtimePolicy}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400">
              <span>Authored by: {sch.createdByManager}</span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 size={12} /> Active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Schedule */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CalendarCheck className="text-blue-600" /> Create Work Schedule
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Select Employee *</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.vendorName.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Select Project *</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Shift Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Shift End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Regular Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={form.regularRate}
                    onChange={(e) => setForm({ ...form, regularRate: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Overtime Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={form.overtimeRate}
                    onChange={(e) => setForm({ ...form, overtimeRate: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Overtime Policy</label>
                <select
                  value={form.overtimePolicy}
                  onChange={(e) =>
                    setForm({ ...form, overtimePolicy: e.target.value as OvertimePolicy })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 outline-none font-medium"
                >
                  <option value="DAILY_AFTER_8">Daily Overtime After 8 Hours</option>
                  <option value="WEEKLY_AFTER_40">Weekly Overtime After 40 Hours</option>
                  <option value="NO_OVERTIME">No Overtime (Standard Flat Cap)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
