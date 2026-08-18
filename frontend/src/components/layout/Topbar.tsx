import { useState } from 'react';
import {
  Bell,
  Search,
  Sparkles,
  HelpCircle,
  RefreshCw,
  CheckCircle,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Role } from '../../types';

export default function Topbar() {
  const { currentUser, switchRole, resetMockData } = useAppStore();
  const [showNotification, setShowNotification] = useState(false);
  const [resetAlert, setResetAlert] = useState(false);

  const handleReset = () => {
    resetMockData();
    setResetAlert(true);
    setTimeout(() => setResetAlert(false), 2500);
  };

  const roleDescriptions: Record<Role, string> = {
    MANAGER: 'Creating work schedules, approving billable regular/OT hours, managing vendor projects.',
    VENDOR: 'Tracking assigned employees, viewing manager schedules, generating invoices from approved hours.',
    EMPLOYEE: 'Filling daily actual hours, start/end/break tracking, submitting weekly timesheets.',
    FINANCE: 'Validating invoices against approved timesheets, three-way matching, issuing payouts.',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-6 flex items-center justify-between shrink-0">
      {/* Left: Role Context & Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/80 border border-blue-100/80">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-bold text-blue-900 tracking-tight capitalize">
            {currentUser.role} Mode
          </span>
          <span className="text-xs text-blue-700/80 hidden md:inline">
            — {roleDescriptions[currentUser.role]}
          </span>
        </div>
      </div>

      {/* Right: Quick Demo Actions */}
      <div className="flex items-center gap-3">
        {/* Reset Demo Data Button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Reset database to initial pristine hackathon demo state"
        >
          <RefreshCw size={13} className={resetAlert ? 'animate-spin text-blue-600' : ''} />
          <span>{resetAlert ? 'Demo Data Reset!' : 'Reset Demo'}</span>
        </button>

        {/* Quick Role Switcher Dropdown */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
          {(['MANAGER', 'VENDOR', 'EMPLOYEE', 'FINANCE'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                currentUser.role === r
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setShowNotification(!showNotification)}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
        </button>
      </div>
    </header>
  );
}
