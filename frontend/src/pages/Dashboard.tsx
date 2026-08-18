import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarCheck,
  Receipt,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    vendors,
    employees,
    projects,
    schedules,
    timesheets,
    invoices,
    payments,
  } = useAppStore();

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingTimesheets = timesheets.filter((t) => t.status === 'SUBMITTED').length;
  const pendingInvoices = invoices.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW'
  ).length;

  const timesheetStatusData = [
    { name: 'Approved', value: timesheets.filter((t) => t.status === 'APPROVED').length },
    { name: 'Submitted', value: timesheets.filter((t) => t.status === 'SUBMITTED').length },
    { name: 'Draft', value: timesheets.filter((t) => t.status === 'DRAFT').length },
    { name: 'Rejected', value: timesheets.filter((t) => t.status === 'REJECTED').length },
  ].filter((d) => d.value > 0);

  const billingChartData = [
    { month: 'Jun 2026', billed: 320000, paid: 320000 },
    { month: 'Jul 2026', billed: 480000, paid: 450000 },
    { month: 'Aug 2026', billed: 620000, paid: totalPaid },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
            <Sparkles size={14} className="text-amber-400" />
            Active Role: {currentUser.role} Workspace
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
            {currentUser.role === 'MANAGER' &&
              'Manage vendor schedules, review employee actual vs expected hours, and approve regular & overtime billable hours.'}
            {currentUser.role === 'VENDOR' &&
              'Track employee actual hours, inspect manager-defined schedules, and generate client invoices from approved timesheets.'}
            {currentUser.role === 'EMPLOYEE' &&
              'Log your daily start/end/break times, view auto-calculated overtime, and submit weekly timesheets.'}
            {currentUser.role === 'FINANCE' &&
              'Audit vendor invoices via 3-way matching, validate tax arithmetic, and execute bank wire settlements.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {currentUser.role === 'EMPLOYEE' && (
            <button
              onClick={() => navigate('/create-timesheet')}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
            >
              <CalendarCheck size={16} /> Log Weekly Timesheet
            </button>
          )}

          {currentUser.role === 'MANAGER' && (
            <button
              onClick={() => navigate('/timesheet-approvals')}
              className="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 size={16} /> Review Pending Timesheets ({pendingTimesheets})
            </button>
          )}

          {currentUser.role === 'VENDOR' && (
            <button
              onClick={() => navigate('/invoices')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all"
            >
              <Receipt size={16} /> Generate Invoice
            </button>
          )}

          {currentUser.role === 'FINANCE' && (
            <button
              onClick={() => navigate('/invoice-validation')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all"
            >
              <ShieldCheck size={16} /> Validate Invoices ({pendingInvoices})
            </button>
          )}
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Active Vendors</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{vendors.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{employees.length} Specialists</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Timesheets In Review</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingTimesheets}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Awaiting signoff</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Gross Billed Volume</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(totalInvoiced)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {formatCurrency(totalPaid)} Settled
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <Receipt size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Active Client Projects</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{projects.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">100% On-Track</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Briefcase size={22} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Billing Trajectory */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Monthly Vendor Billing & Settlements</h3>
            <span className="text-xs text-blue-600 font-semibold">18% GST Verified</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={billingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Amount']} />
              <Bar dataKey="billed" fill="#3b82f6" name="Invoiced" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" fill="#10b981" name="Paid Out" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timesheet Approval Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-gray-800">Timesheet Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={timesheetStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {timesheetStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-[11px] text-gray-400">
            Real-time synchronization across Manager & Vendor channels.
          </p>
        </div>
      </div>

      {/* End-to-End Workflow Blueprint Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          End-to-End Core Workflow Progression
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1">
            <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-800">
              STEP 1: MANAGER
            </span>
            <p className="font-bold">Creates Work Schedule</p>
            <p className="text-[11px] text-blue-700">Defines 40h plan, shifts, ₹500/hr regular & ₹750/hr OT rates.</p>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
            <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
              STEP 2: EMPLOYEE
            </span>
            <p className="font-bold">Logs Daily Actual Hours</p>
            <p className="text-[11px] text-emerald-700">Inputs start, end, break times with auto-calculated overtime.</p>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 space-y-1">
            <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-purple-200 text-purple-800">
              STEP 3: MANAGER
            </span>
            <p className="font-bold">Approves Billable Hours</p>
            <p className="text-[11px] text-purple-700">Inspects variance warnings and locks regular/OT billables.</p>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
            <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-800">
              STEP 4: VENDOR
            </span>
            <p className="font-bold">Generates Invoice</p>
            <p className="text-[11px] text-amber-700">Compiles approved hours into formal client invoice.</p>
          </div>

          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-teal-900 space-y-1">
            <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-teal-200 text-teal-800">
              STEP 5: FINANCE
            </span>
            <p className="font-bold">3-Way Audit & Payment</p>
            <p className="text-[11px] text-teal-700">Validates arithmetic and releases bank wire (Status: PAID).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
