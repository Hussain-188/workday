import { useState } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Clock,
  Briefcase,
  User,
  Calendar,
  Building,
  Check,
  X,
  MessageSquare,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';
import { Timesheet } from '../types';

export default function TimesheetApprovals() {
  const { timesheets, approveTimesheet, rejectTimesheet } = useAppStore();

  const [selectedTs, setSelectedTs] = useState<Timesheet | null>(
    timesheets.find((t) => t.status === 'SUBMITTED') || timesheets[0] || null
  );

  const [approvedRegHours, setApprovedRegHours] = useState<number>(
    selectedTs?.totalScheduledHours || 40
  );
  const [approvedOtHours, setApprovedOtHours] = useState<number>(
    selectedTs?.totalPotentialOvertime || 0
  );
  const [managerComment, setManagerComment] = useState<string>('Approved regular & overtime hours based on sprint release telemetry.');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string>('');

  const handleSelect = (ts: Timesheet) => {
    setSelectedTs(ts);
    setApprovedRegHours(ts.totalScheduledHours);
    setApprovedOtHours(ts.totalPotentialOvertime);
    setManagerComment('Approved regular & overtime hours based on sprint release telemetry.');
  };

  const handleApprove = () => {
    if (!selectedTs) return;
    approveTimesheet(selectedTs.id, approvedRegHours, approvedOtHours, managerComment);
    setSuccessNotice(`Timesheet ${selectedTs.timesheetNumber} approved successfully! (${approvedRegHours + approvedOtHours}h Billable)`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleReject = () => {
    if (!selectedTs || !rejectionReason) {
      alert('Please enter a rejection reason.');
      return;
    }
    rejectTimesheet(selectedTs.id, rejectionReason);
    setShowRejectModal(false);
    setSuccessNotice(`Timesheet ${selectedTs.timesheetNumber} rejected and sent back for corrections.`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const statusBadges: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    UNDER_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    RESUBMITTED: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const billableAmount =
    approvedRegHours * (selectedTs?.regularRate || 500) +
    approvedOtHours * (selectedTs?.overtimeRate || 750);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <CheckSquare className="text-blue-600" /> Manager Timesheet Review & Approvals
        </h1>
        <p className="text-sm text-gray-500">
          Compare scheduled vs actual hours, approve regular and overtime hours separately, and lock billable totals for vendor invoicing.
        </p>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={18} /> {successNotice}
        </div>
      )}

      {/* 2-Column Layout: Left List, Right Approval Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue of Submitted Timesheets */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Timesheet Inbox</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
              {timesheets.filter((t) => t.status === 'SUBMITTED').length} Pending
            </span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {timesheets.map((ts) => {
              const isSelected = selectedTs?.id === ts.id;
              return (
                <div
                  key={ts.id}
                  onClick={() => handleSelect(ts)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900">{ts.timesheetNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        statusBadges[ts.status] || 'bg-gray-100'
                      }`}
                    >
                      {ts.status}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-gray-900 mt-1.5">{ts.employeeName}</p>
                  <p className="text-xs text-gray-500 truncate">{ts.projectName}</p>

                  <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                    <span className="text-gray-500">
                      Sched: <b>{ts.totalScheduledHours}h</b>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Actual: {ts.totalActualHours}h
                    </span>
                    {ts.totalPotentialOvertime > 0 && (
                      <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        +{ts.totalPotentialOvertime}h OT
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Inspection & Approval Controls */}
        {selectedTs ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Header Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">{selectedTs.employeeName}</h2>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold border ${
                        statusBadges[selectedTs.status]
                      }`}
                    >
                      {selectedTs.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Vendor: <b className="text-gray-700">{selectedTs.vendorName}</b> &bull; Project:{' '}
                    <b className="text-gray-700">{selectedTs.projectName}</b>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-400">Week Period</span>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedTs.weekStartDate} to {selectedTs.weekEndDate}
                  </p>
                </div>
              </div>

              {/* AI & Telemetry Variance Flags */}
              {selectedTs.aiFlags && selectedTs.aiFlags.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <Sparkles size={15} className="text-amber-600" /> Variance Flags & Review Intelligence
                  </div>
                  <ul className="text-xs text-amber-800 space-y-1 pl-1">
                    {selectedTs.aiFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 font-medium">
                        <span>•</span> {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Daily Schedule vs Actual Comparison Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Daily Schedule vs Actual Comparison
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Day / Date</th>
                        <th className="p-3 text-center">Scheduled Time</th>
                        <th className="p-3 text-center">Actual Time</th>
                        <th className="p-3 text-right">Actual Hours</th>
                        <th className="p-3 text-right">Potential OT</th>
                        <th className="p-3">Work Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedTs.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className={entry.potentialOvertimeHours > 0 ? 'bg-amber-50/40' : ''}
                        >
                          <td className="p-3 font-semibold text-gray-800">
                            {entry.day} ({entry.date})
                          </td>
                          <td className="p-3 text-center text-gray-500">09:00 - 17:00 (8h)</td>
                          <td className="p-3 text-center font-medium text-gray-800">
                            {entry.startTime} - {entry.endTime} ({entry.breakMinutes}m break)
                          </td>
                          <td className="p-3 text-right font-black text-gray-900">
                            {entry.actualHours}h
                          </td>
                          <td className="p-3 text-right">
                            {entry.potentialOvertimeHours > 0 ? (
                              <span className="text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded">
                                +{entry.potentialOvertimeHours}h OT
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 truncate max-w-xs">
                            {entry.workDescription || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manager Billable Hours Approval Box */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-blue-600" />
                    Approve Billable Hours (Regular & Overtime Separated)
                  </h4>
                  <span className="text-xs font-semibold text-blue-700">
                    Billing Rate: ₹{selectedTs.regularRate}/h (OT: ₹{selectedTs.overtimeRate}/h)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Approved Regular Hours
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        min="0"
                        max="40"
                        step="0.5"
                        disabled={selectedTs.status === 'APPROVED'}
                        value={approvedRegHours}
                        onChange={(e) => setApprovedRegHours(parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400">hours</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Approved Overtime Hours
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        disabled={selectedTs.status === 'APPROVED'}
                        value={approvedOtHours}
                        onChange={(e) => setApprovedOtHours(parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-amber-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400">hours</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Calculated Billable Value
                    </label>
                    <div className="mt-1 p-2 bg-white rounded-lg border border-blue-200 text-sm font-black text-blue-700 flex items-center justify-between">
                      <span>{approvedRegHours + approvedOtHours} Billable Hours</span>
                      <span>{formatCurrency(billableAmount)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Manager Review Comment</label>
                  <textarea
                    rows={2}
                    disabled={selectedTs.status === 'APPROVED'}
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    placeholder="Provide justification for overtime approval or general feedback..."
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {selectedTs.status !== 'APPROVED' && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors flex items-center gap-1.5"
                  >
                    <XCircle size={15} /> Reject Timesheet
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setApprovedRegHours(40);
                        setApprovedOtHours(0);
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl"
                    >
                      Approve Regular Only (40h)
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      <Check size={16} /> Approve Billable Hours ({approvedRegHours + approvedOtHours}h)
                    </button>
                  </div>
                </div>
              )}

              {selectedTs.status === 'APPROVED' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>
                      This timesheet is <b>APPROVED & LOCKED</b> by {selectedTs.reviewedBy}. Approved for vendor invoicing.
                    </span>
                  </div>
                  <span className="font-bold">
                    Billable: {selectedTs.approvedBillableHours || 40}h ({formatCurrency(billableAmount)})
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
            Select a timesheet from the inbox to review.
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <ShieldAlert size={18} /> Reject Timesheet
              </h3>
              <button onClick={() => setShowRejectModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Please provide the reason for rejection. The employee will receive notification and can edit & resubmit the corrected timesheet.
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Wednesday 1h overtime lacks client approval. Please revise to 8h..."
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
