import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  CalendarCheck,
  CheckSquare,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  BarChart3,
  LogOut,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Role } from '../../types';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  badge?: number;
  roles: Role[];
}

export default function Sidebar() {
  const { currentUser, switchRole, timesheets, invoices } = useAppStore();
  const navigate = useNavigate();

  // Dynamic Badges
  const pendingTimesheets = timesheets.filter((t) => t.status === 'SUBMITTED').length;
  const pendingInvoices = invoices.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW'
  ).length;

  const navItems: NavItem[] = [
    // Common
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['MANAGER', 'VENDOR', 'EMPLOYEE', 'FINANCE'] },

    // Manager Specific
    { to: '/vendors', icon: Building2, label: 'Vendors', roles: ['MANAGER'] },
    { to: '/employees', icon: Users, label: 'Vendor Employees', roles: ['MANAGER'] },
    { to: '/projects', icon: Briefcase, label: 'Projects & Rates', roles: ['MANAGER'] },
    { to: '/schedules', icon: CalendarCheck, label: 'Work Schedules', roles: ['MANAGER'] },
    {
      to: '/timesheet-approvals',
      icon: CheckSquare,
      label: 'Timesheet Approvals',
      badge: pendingTimesheets,
      roles: ['MANAGER'],
    },

    // Vendor Specific
    { to: '/my-employees', icon: Users, label: 'My Employees', roles: ['VENDOR'] },
    { to: '/vendor-projects', icon: Briefcase, label: 'Assigned Projects', roles: ['VENDOR'] },
    { to: '/vendor-schedules', icon: CalendarCheck, label: 'Manager Schedules', roles: ['VENDOR'] },
    { to: '/vendor-timesheets', icon: FileSpreadsheet, label: 'Employee Timesheets', roles: ['VENDOR'] },

    // Employee Specific
    { to: '/my-schedule', icon: CalendarCheck, label: 'My Schedule', roles: ['EMPLOYEE'] },
    { to: '/my-project', icon: Briefcase, label: 'My Project', roles: ['EMPLOYEE'] },
    { to: '/my-timesheets', icon: FileSpreadsheet, label: 'My Timesheets', roles: ['EMPLOYEE'] },
    { to: '/create-timesheet', icon: PlusCircle, label: 'Create Timesheet', roles: ['EMPLOYEE'] },

    // Invoices & Finance
    {
      to: '/invoices',
      icon: Receipt,
      label: currentUser.role === 'FINANCE' ? 'All Invoices' : 'Invoices',
      badge: currentUser.role === 'FINANCE' ? pendingInvoices : undefined,
      roles: ['MANAGER', 'VENDOR', 'FINANCE'],
    },
    { to: '/invoice-validation', icon: ShieldCheck, label: 'Invoice Validation', roles: ['FINANCE'] },
    { to: '/payments', icon: CreditCard, label: 'Payments', roles: ['VENDOR', 'FINANCE'] },

    // Reports
    { to: '/reports', icon: BarChart3, label: 'Reports & Analytics', roles: ['MANAGER', 'FINANCE'] },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(currentUser.role));

  const roleColors: Record<Role, { bg: string; text: string; border: string }> = {
    MANAGER: { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-500/30' },
    VENDOR: { bg: 'bg-blue-950/80', text: 'text-blue-300', border: 'border-blue-500/30' },
    EMPLOYEE: { bg: 'bg-emerald-950/80', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    FINANCE: { bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-500/30' },
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col text-slate-200">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <div className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
              VendorSync <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">PRO</span>
            </div>
            <div className="text-[11px] text-slate-400">VMS & Timesheet Portal</div>
          </div>
        </div>
      </div>

      {/* Role Switcher Pill */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Active Role</span>
          <Sparkles size={12} className="text-amber-400" />
        </div>
        <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['MANAGER', 'VENDOR', 'EMPLOYEE', 'FINANCE'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                switchRole(r);
                navigate('/');
              }}
              className={`text-[11px] font-medium py-1 px-1.5 rounded transition-all capitalize ${
                currentUser.role === r
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {r.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
          {currentUser.role} Workspace
        </div>
        {allowedNav.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <Icon size={16} />
              <span>{label}</span>
            </div>
            {badge !== undefined && badge > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl border ${
            roleColors[currentUser.role].bg
          } ${roleColors[currentUser.role].border}`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden shrink-0 border border-slate-600">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                {currentUser.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
            <p className={`text-[10px] capitalize font-medium ${roleColors[currentUser.role].text}`}>
              {currentUser.role.toLowerCase()}
              {currentUser.vendorName ? ` • ${currentUser.vendorName.split(' ')[0]}` : ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
