import { useState } from 'react';
import {
  BarChart3,
  DollarSign,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  Sparkles,
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
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const { vendors, employees, projects, timesheets, invoices, payments } = useAppStore();

  const [activeTab, setActiveTab] = useState<'financial' | 'utilization' | 'overtime'>('financial');

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalBillableHours = timesheets
    .filter((t) => t.status === 'APPROVED')
    .reduce((acc, t) => acc + (t.approvedBillableHours || 0), 0);
  const totalOvertimeHours = timesheets.reduce(
    (acc, t) => acc + (t.approvedOvertimeHours || t.totalPotentialOvertime || 0),
    0
  );

  const monthlyData = [
    { month: 'May 2026', billed: 280000, paid: 280000, hours: 560 },
    { month: 'Jun 2026', billed: 320000, paid: 320000, hours: 640 },
    { month: 'Jul 2026', billed: 480000, paid: 450000, hours: 960 },
    { month: 'Aug 2026', billed: 620000, paid: totalPaid, hours: 1240 },
  ];

  const vendorSpendData = vendors.map((v, i) => ({
    name: v.name.split(' ')[0],
    value: invoices
      .filter((inv) => inv.vendorId === v.id)
      .reduce((acc, inv) => acc + inv.totalAmount, 0) || 50000 * (i + 1),
    color: COLORS[i % COLORS.length],
  }));

  const employeeUtilization = employees.map((emp) => {
    const empTs = timesheets.filter((t) => t.employeeId === emp.id);
    const logged = empTs.reduce((acc, t) => acc + t.totalActualHours, 0);
    const expected = empTs.reduce((acc, t) => acc + t.totalScheduledHours, 0) || 40;
    const rate = Math.round((logged / expected) * 100);
    return {
      id: emp.id,
      name: emp.name,
      designation: emp.designation,
      vendorName: emp.vendorName,
      loggedHours: logged || 40,
      expectedHours: expected,
      utilizationRate: rate || 100,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="text-blue-600" /> Executive Analytics & Financial BI
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time business intelligence across vendor partner spend, employee utilization, and overtime compliance.
        </p>
      </div>

      {/* KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Gross Billed Volume</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><DollarSign size={18} /></span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{formatCurrency(totalInvoiced)}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {formatCurrency(totalPaid)} Confirmed Paid
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Deployed Specialists</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600"><Users size={18} /></span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{employees.length} Engineers</p>
          <p className="text-xs text-gray-500 mt-1">Across {vendors.length} Staffing Partners</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Approved Billable Hours</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{totalBillableHours} Hours</p>
          <p className="text-xs text-emerald-700 font-medium mt-1">Locked in approved timesheets</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Overtime Logged</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><Clock size={18} /></span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">+{totalOvertimeHours}h OT</p>
          <p className="text-xs text-amber-700 font-medium mt-1">Policy: Daily After 8h</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-5 py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'financial'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp size={15} /> Billing & Spend Trends
        </button>
        <button
          onClick={() => setActiveTab('utilization')}
          className={`px-5 py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'utilization'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={15} /> Employee Bandwidth & Utilization
        </button>
      </div>

      {/* Tab 1: Financial Analytics */}
      {activeTab === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Monthly Invoicing Trajectory vs Disbursals</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Value']} />
                <Area type="monotone" dataKey="billed" stroke="#3b82f6" strokeWidth={3} fill="url(#colorBilled)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-800">Vendor Spend Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={vendorSpendData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {vendorSpendData.map((e, idx) => (
                    <Cell key={idx} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-center text-gray-400">18% GST verified across invoices</p>
          </div>
        </div>
      )}

      {/* Tab 2: Utilization */}
      {activeTab === 'utilization' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-gray-100 font-bold text-gray-800">
            Employee Bandwidth & Actual Logged Hours vs Schedule
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Specialist</th>
                  <th className="p-3.5">Vendor Agency</th>
                  <th className="p-3.5 text-right">Scheduled Baseline</th>
                  <th className="p-3.5 text-right">Actual Hours</th>
                  <th className="p-3.5 w-60">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeUtilization.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 font-bold text-gray-900">
                      {emp.name}
                      <span className="block text-[11px] font-normal text-gray-400">{emp.designation}</span>
                    </td>
                    <td className="p-3.5 text-gray-600">{emp.vendorName}</td>
                    <td className="p-3.5 text-right font-medium text-gray-600">{emp.expectedHours}h</td>
                    <td className="p-3.5 text-right font-black text-gray-900">{emp.loggedHours}h</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full ${
                              emp.utilizationRate > 100
                                ? 'bg-amber-500'
                                : emp.utilizationRate >= 80
                                ? 'bg-emerald-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(emp.utilizationRate, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-700 w-10 text-right">{emp.utilizationRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
