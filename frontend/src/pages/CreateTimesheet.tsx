import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Send,
  Save,
  Info,
  Building,
  User,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import {
  calculateActualHours,
  calculateDailyOvertime,
  validateDailyEntry,
  formatCurrency,
} from '../utils/calculations';
import { DailyTimeEntry, Timesheet } from '../types';

export default function CreateTimesheet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const {
    currentUser,
    projects,
    schedules,
    timesheets,
    createOrUpdateTimesheet,
    submitTimesheet,
  } = useAppStore();

  // Find user's assigned project & schedule
  const activeSchedule = schedules[0]; // Ravi Kumar schedule
  const activeProject = projects[0];

  // State for daily rows
  const [entries, setEntries] = useState<DailyTimeEntry[]>([
    {
      id: 'd-1',
      date: '2026-08-17',
      day: 'Mon',
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      scheduledHours: 8,
      startTime: '09:00',
      endTime: '17:30',
      breakMinutes: 30,
      workDescription: 'API development & database schema validation',
      actualHours: 8,
      potentialOvertimeHours: 0,
      hasWarning: false,
    },
    {
      id: 'd-2',
      date: '2026-08-18',
      day: 'Tue',
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      scheduledHours: 8,
      startTime: '09:00',
      endTime: '17:30',
      breakMinutes: 30,
      workDescription: 'Bug fixes in payment checkout endpoints',
      actualHours: 8,
      potentialOvertimeHours: 0,
      hasWarning: false,
    },
    {
      id: 'd-3',
      date: '2026-08-19',
      day: 'Wed',
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      scheduledHours: 8,
      startTime: '09:00',
      endTime: '18:30',
      breakMinutes: 30,
      workDescription: 'Integration testing with banking simulator',
      actualHours: 9,
      potentialOvertimeHours: 1,
      hasWarning: true,
      warningMessage: 'Wednesday exceeded schedule by 1h overtime',
    },
    {
      id: 'd-4',
      date: '2026-08-20',
      day: 'Thu',
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      scheduledHours: 8,
      startTime: '09:00',
      endTime: '17:30',
      breakMinutes: 30,
      workDescription: 'API Swagger documentation and code review',
      actualHours: 8,
      potentialOvertimeHours: 0,
      hasWarning: false,
    },
    {
      id: 'd-5',
      date: '2026-08-21',
      day: 'Fri',
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      scheduledHours: 8,
      startTime: '09:00',
      endTime: '18:30',
      breakMinutes: 30,
      workDescription: 'Release support and telemetry verification',
      actualHours: 9,
      potentialOvertimeHours: 1,
      hasWarning: true,
      warningMessage: 'Friday exceeded schedule by 1h overtime',
    },
  ]);

  const [timesheetStatus, setTimesheetStatus] = useState<string>('DRAFT');
  const [successMsg, setSuccessMsg] = useState('');

  // If editing an existing timesheet
  useEffect(() => {
    if (editId) {
      const existing = timesheets.find((t) => t.id === editId);
      if (existing) {
        setEntries(existing.entries);
        setTimesheetStatus(existing.status);
      }
    }
  }, [editId, timesheets]);

  // Handle updates in daily row
  const handleEntryChange = (
    index: number,
    field: keyof DailyTimeEntry,
    value: any
  ) => {
    setEntries((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // Re-calculate actual hours
      const actual = calculateActualHours(
        current.startTime,
        current.endTime,
        Number(current.breakMinutes) || 0
      );

      // Re-calculate overtime (DAILY_AFTER_8)
      const ot = calculateDailyOvertime(actual);

      // Validate
      const validation = validateDailyEntry(
        current.scheduledHours,
        current.startTime,
        current.endTime,
        Number(current.breakMinutes) || 0,
        current.workDescription
      );

      current.actualHours = actual;
      current.potentialOvertimeHours = ot;
      current.hasWarning = validation.hasWarning || validation.hasError;
      current.warningMessage = validation.warningMessage || validation.errorMessage;

      updated[index] = current;
      return updated;
    });
  };

  // Calculations across the full week
  const totalScheduled = entries.reduce((acc, row) => acc + row.scheduledHours, 0);
  const totalActual = entries.reduce((acc, row) => acc + row.actualHours, 0);
  const totalOvertime = entries.reduce(
    (acc, row) => acc + row.potentialOvertimeHours,
    0
  );
  const missingHours = Math.max(0, totalScheduled - totalActual);

  const hasAnyErrors = entries.some(
    (e) => e.startTime >= e.endTime && e.actualHours === 0 && e.scheduledHours > 0
  );

  const handleSaveDraft = () => {
    const tsData: Partial<Timesheet> = {
      id: editId || `ts-${Date.now()}`,
      employeeId: currentUser.employeeId || 'emp-1',
      employeeName: currentUser.name,
      vendorId: currentUser.vendorId || 'ven-1',
      vendorName: currentUser.vendorName || 'TechNova Solutions Pvt Ltd',
      projectId: activeProject.id,
      projectName: activeProject.name,
      projectCode: activeProject.code,
      scheduleId: activeSchedule.id,
      weekStartDate: '2026-08-17',
      weekEndDate: '2026-08-21',
      entries,
      totalScheduledHours: totalScheduled,
      totalActualHours: totalActual,
      totalPotentialOvertime: totalOvertime,
      missingHours,
      status: 'DRAFT',
      regularRate: activeSchedule.regularRate,
      overtimeRate: activeSchedule.overtimeRate,
    };

    createOrUpdateTimesheet(tsData);
    setSuccessMsg('Timesheet draft saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = () => {
    const tsId = editId || `ts-${Date.now()}`;
    const tsData: Partial<Timesheet> = {
      id: tsId,
      employeeId: currentUser.employeeId || 'emp-1',
      employeeName: currentUser.name,
      vendorId: currentUser.vendorId || 'ven-1',
      vendorName: currentUser.vendorName || 'TechNova Solutions Pvt Ltd',
      projectId: activeProject.id,
      projectName: activeProject.name,
      projectCode: activeProject.code,
      scheduleId: activeSchedule.id,
      weekStartDate: '2026-08-17',
      weekEndDate: '2026-08-21',
      entries,
      totalScheduledHours: totalScheduled,
      totalActualHours: totalActual,
      totalPotentialOvertime: totalOvertime,
      missingHours,
      status: 'SUBMITTED',
      regularRate: activeSchedule.regularRate,
      overtimeRate: activeSchedule.overtimeRate,
      submittedAt: new Date().toISOString(),
      aiFlags: [
        totalOvertime > 0
          ? `⚠ Daily overtime logged: ${totalOvertime}h across week`
          : '✓ All hours match schedule',
      ],
    };

    createOrUpdateTimesheet(tsData);
    submitTimesheet(tsId);
    navigate('/my-timesheets');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-1"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Weekly Timesheet Submission
          </h1>
          <p className="text-sm text-gray-500">
            Log your actual hours, breaks, and task descriptions. Overtime is auto-calculated after 8h/day.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
          >
            <Save size={15} /> Save Draft
          </button>
          <button
            onClick={handleSubmit}
            disabled={hasAnyErrors}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            <Send size={15} /> Submit for Approval
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Header Context Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <User size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Employee</p>
            <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
            <p className="text-xs text-gray-500">Sr. Backend Engineer</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Project</p>
            <p className="text-sm font-bold text-gray-800">{activeProject.name}</p>
            <p className="text-xs text-purple-600 font-medium">{activeProject.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Week Period</p>
            <p className="text-sm font-bold text-gray-800">Aug 17 – Aug 21, 2026</p>
            <p className="text-xs text-gray-500">Standard 5-Day Week</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Building size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Vendor Agency</p>
            <p className="text-sm font-bold text-gray-800">TechNova Solutions</p>
            <p className="text-xs text-emerald-600 font-medium">Rate: ₹500/hr (OT: ₹750/hr)</p>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Scheduled Hours</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{totalScheduled}h</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Manager Planned</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Actual Logged Hours</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalActual}h</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Auto-calculated from Start/End</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Potential Overtime</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{totalOvertime}h</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Daily &gt; 8h Policy</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Missing Hours</p>
            <p className={`text-2xl font-black mt-1 ${missingHours > 0 ? 'text-red-500' : 'text-gray-800'}`}>
              {missingHours}h
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Unlogged Schedule Time</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
            <Info size={22} />
          </div>
        </div>
      </div>

      {/* Main Daily Timesheet Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">Daily Work Log (Pre-populated from Schedule)</h3>
            <p className="text-xs text-gray-500">
              Only change your <b>Start</b>, <b>End</b>, and <b>Break</b> times. The formula calculates: <code className="text-blue-600 font-semibold">Actual = End - Start - Break</code>
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Policy: Daily Overtime After 8h
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-28">Date & Day</th>
                <th className="py-3.5 px-3 w-28 text-gray-400">Scheduled</th>
                <th className="py-3.5 px-3 w-28">Start Time</th>
                <th className="py-3.5 px-3 w-28">End Time</th>
                <th className="py-3.5 px-3 w-24">Break (min)</th>
                <th className="py-3.5 px-3 w-24 text-right">Actual Hours</th>
                <th className="py-3.5 px-3 w-24 text-right">Overtime</th>
                <th className="py-3.5 px-4">Work Description</th>
                <th className="py-3.5 px-4 w-44">Validation / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    row.potentialOvertimeHours > 0 ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Date & Day */}
                  <td className="py-3.5 px-4 font-semibold text-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {row.day}
                      </span>
                      <div>
                        <div>{row.date}</div>
                      </div>
                    </div>
                  </td>

                  {/* Scheduled */}
                  <td className="py-3.5 px-3 text-gray-500 font-medium">
                    {row.scheduledHours}h (09:00-17:00)
                  </td>

                  {/* Start Time */}
                  <td className="py-3.5 px-3">
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) => handleEntryChange(idx, 'startTime', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* End Time */}
                  <td className="py-3.5 px-3">
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(e) => handleEntryChange(idx, 'endTime', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Break Minutes */}
                  <td className="py-3.5 px-3">
                    <select
                      value={row.breakMinutes}
                      onChange={(e) =>
                        handleEntryChange(idx, 'breakMinutes', Number(e.target.value))
                      }
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="0">0 min</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </td>

                  {/* Actual Hours */}
                  <td className="py-3.5 px-3 text-right font-black text-sm text-gray-900">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md ${
                        row.actualHours > 8
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {row.actualHours.toFixed(1)}h
                    </span>
                  </td>

                  {/* Potential Overtime */}
                  <td className="py-3.5 px-3 text-right">
                    {row.potentialOvertimeHours > 0 ? (
                      <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{row.potentialOvertimeHours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Work Description */}
                  <td className="py-3.5 px-4">
                    <input
                      type="text"
                      placeholder="e.g. API development, bug fixes, integration..."
                      value={row.workDescription}
                      onChange={(e) =>
                        handleEntryChange(idx, 'workDescription', e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Warnings / Validation */}
                  <td className="py-3.5 px-4">
                    {row.hasWarning ? (
                      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/80 text-[11px] font-medium leading-tight">
                        <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                        <span>{row.warningMessage}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                        <CheckCircle2 size={13} /> On Schedule
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Calculation Summary */}
        <div className="p-5 bg-slate-50 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              💡 <b>Note:</b> Overtime hours will be reviewed by <b>Maya Manager</b> before becoming billable on invoices.
            </p>
            <p>
              Expected Billable Amount: <span className="font-bold text-gray-800">40h × ₹500 + 2h OT × ₹750 = ₹21,500</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 shadow-sm"
            >
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={hasAnyErrors}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={15} /> Submit Timesheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
