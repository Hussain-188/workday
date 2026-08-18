import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Edit,
  Send,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TimesheetStatus } from '../types';

export default function MyTimesheets() {
  const navigate = useNavigate();
  const { timesheets, currentUser, submitTimesheet } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter for employee's timesheets
  const myTimesheets = timesheets.filter((t) =>
    currentUser.employeeId ? t.employeeId === currentUser.employeeId : true
  );

  const filtered = myTimesheets.filter((t) => {
    const matchSearch =
      t.timesheetNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.projectName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColors: Record<TimesheetStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    UNDER_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    RESUBMITTED: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" /> My Weekly Timesheets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review your logged actual hours, monitor manager review progress, and revise rejected submissions.
          </p>
        </div>

        <button
          onClick={() => navigate('/create-timesheet')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus size={16} />
          Create / Log Weekly Timesheet
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search timesheet # or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Timesheet List Cards */}
      <div className="space-y-4">
        {filtered.map((ts) => (
          <div
            key={ts.id}
            className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{ts.timesheetNumber}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        statusColors[ts.status]
                      }`}
                    >
                      {ts.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Week Period: <b>{ts.weekStartDate} to {ts.weekEndDate}</b> &bull; Project:{' '}
                    <b>{ts.projectName}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <span className="text-gray-400">Scheduled</span>
                  <p className="font-bold text-gray-800">{ts.totalScheduledHours}h</p>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">Actual Logged</span>
                  <p className="font-black text-gray-900 text-sm">{ts.totalActualHours}h</p>
                </div>
                {ts.totalPotentialOvertime > 0 && (
                  <div className="text-right">
                    <span className="text-amber-600">Overtime</span>
                    <p className="font-bold text-amber-700">+{ts.totalPotentialOvertime}h</p>
                  </div>
                )}
                {ts.status === 'APPROVED' && (
                  <div className="text-right pl-2 border-l border-gray-200">
                    <span className="text-emerald-600">Approved Billable</span>
                    <p className="font-black text-emerald-700 text-sm">
                      {ts.approvedBillableHours}h
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection / Manager Note Banner */}
            {ts.status === 'REJECTED' && ts.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Manager Rejection Feedback:</p>
                  <p className="mt-0.5">{ts.rejectionReason}</p>
                </div>
              </div>
            )}

            {ts.status === 'APPROVED' && ts.managerComment && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <b>Manager Note:</b> {ts.managerComment} (Reviewed by {ts.reviewedBy})
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-gray-400 text-[11px]">
                {ts.submittedAt ? `Submitted on ${new Date(ts.submittedAt).toLocaleDateString()}` : 'Draft not submitted'}
              </span>

              <div className="flex items-center gap-2">
                {ts.status === 'DRAFT' && (
                  <button
                    onClick={() => submitTimesheet(ts.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Send size={13} /> Submit Now
                  </button>
                )}

                {ts.status !== 'APPROVED' && (
                  <button
                    onClick={() => navigate(`/create-timesheet?id=${ts.id}`)}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Edit size={13} /> Edit Entry
                  </button>
                )}

                {ts.status === 'APPROVED' && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 size={13} /> Locked & Approved
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
