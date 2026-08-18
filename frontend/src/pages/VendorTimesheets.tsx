import { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Receipt,
  Eye,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { TimesheetStatus } from '../types';
import { useNavigate } from 'react-router-dom';

export default function VendorTimesheets() {
  const navigate = useNavigate();
  const { timesheets, employees, projects, currentUser } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  // Filter for vendor's employees
  const vendorTimesheets = timesheets.filter((t) =>
    currentUser.vendorId ? t.vendorId === currentUser.vendorId : true
  );

  const filtered = vendorTimesheets.filter((t) => {
    const matchSearch =
      t.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      t.timesheetNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchProj = projectFilter === 'ALL' || t.projectId === projectFilter;
    return matchSearch && matchStatus && matchProj;
  });

  const statusColors: Record<TimesheetStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
    UNDER_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    RESUBMITTED: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const approvedForInvoicing = vendorTimesheets.filter(
    (t) => t.status === 'APPROVED' && !t.invoiced
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" /> Vendor Employee Timesheet Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor expected vs actual vs overtime vs approved hours across your deployed specialists.
          </p>
        </div>

        {approvedForInvoicing.length > 0 && (
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all"
          >
            <Receipt size={16} />
            Generate Invoice ({approvedForInvoicing.length} Approved Ready)
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Total Tracked Timesheets</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{vendorTimesheets.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">All sprint cycles</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Submitted & In Review</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {vendorTimesheets.filter((t) => t.status === 'SUBMITTED').length}
          </p>
          <p className="text-[11px] text-blue-700 mt-0.5">Awaiting manager signoff</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Manager Approved</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {vendorTimesheets.filter((t) => t.status === 'APPROVED').length}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Lock-in billable hours</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Pending Invoicing</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {approvedForInvoicing.length}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Ready to bill client</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee or timesheet #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

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
      </div>

      {/* Main Vendor Employee Tracking Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4">Employee</th>
                <th className="py-4 px-4">Project</th>
                <th className="py-4 px-3 text-center">Expected</th>
                <th className="py-4 px-3 text-center">Actual</th>
                <th className="py-4 px-3 text-center">Overtime</th>
                <th className="py-4 px-3 text-center">Approved Billable</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-right">Invoiced?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((ts) => (
                <tr key={ts.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Employee */}
                  <td className="py-4 px-4 font-bold text-gray-900">
                    <div>
                      {ts.employeeName}
                      <span className="block text-[11px] font-normal text-gray-400">
                        {ts.timesheetNumber}
                      </span>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="py-4 px-4 text-gray-700 font-medium">
                    {ts.projectName}
                    <span className="block text-[11px] text-purple-600">{ts.projectCode}</span>
                  </td>

                  {/* Expected */}
                  <td className="py-4 px-3 text-center font-bold text-gray-600">
                    {ts.totalScheduledHours}h
                  </td>

                  {/* Actual */}
                  <td className="py-4 px-3 text-center font-black text-gray-900">
                    {ts.totalActualHours}h
                  </td>

                  {/* Overtime */}
                  <td className="py-4 px-3 text-center">
                    {ts.totalPotentialOvertime > 0 ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{ts.totalPotentialOvertime}h
                      </span>
                    ) : (
                      <span className="text-gray-400">0h</span>
                    )}
                  </td>

                  {/* Approved */}
                  <td className="py-4 px-3 text-center">
                    {ts.status === 'APPROVED' ? (
                      <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-sm">
                        {ts.approvedBillableHours}h
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Pending Review</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        statusColors[ts.status]
                      }`}
                    >
                      {ts.status}
                    </span>
                  </td>

                  {/* Invoiced */}
                  <td className="py-4 px-4 text-right">
                    {ts.invoiced ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        ✓ Invoiced
                      </span>
                    ) : ts.status === 'APPROVED' ? (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Ready to Bill
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
