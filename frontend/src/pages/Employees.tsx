import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  Star,
  X,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';
import { Employee } from '../types';

export default function Employees() {
  const { employees, vendors, currentUser, addEmployee, updateEmployee } = useAppStore();

  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    vendorId: vendors[0]?.id || '',
    name: '',
    email: '',
    phone: '',
    designation: 'Senior Full Stack Engineer',
    skills: 'React, Node.js, TypeScript, PostgreSQL',
    hourlyRate: 500,
  });

  const isVendor = currentUser.role === 'VENDOR';
  const displayEmployees = isVendor && currentUser.vendorId
    ? employees.filter((e) => e.vendorId === currentUser.vendorId)
    : employees;

  const filtered = displayEmployees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase()) ||
      e.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchVendor = vendorFilter === 'ALL' || e.vendorId === vendorFilter;
    return matchSearch && matchVendor;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === form.vendorId);
    addEmployee({
      vendorId: form.vendorId,
      vendorName: vendor?.name || 'Vendor',
      name: form.name,
      email: form.email,
      phone: form.phone,
      designation: form.designation,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      status: 'Active',
      rating: 4.8,
      hourlyRate: Number(form.hourlyRate),
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" />
            {isVendor ? 'My Agency Specialists & Employees' : 'Vendor Employees Directory'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View technical talent rosters, skillset tags, standard hourly rates, and active deployment status.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search specialist, skill, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!isVendor && (
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Vendor Agencies</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm border border-blue-200">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{emp.name}</h3>
                  <p className="text-xs text-blue-600 font-medium">{emp.designation}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {emp.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-gray-500">
              <p className="flex items-center gap-1.5 truncate">
                <Building size={13} className="text-gray-400" />
                <span className="font-semibold text-gray-700">{emp.vendorName}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail size={13} className="text-gray-400" />
                <span>{emp.email}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={13} className="text-gray-400" />
                <span>{emp.phone}</span>
              </p>
            </div>

            {/* Skills Badges */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Core Competencies
              </p>
              <div className="flex flex-wrap gap-1">
                {emp.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Base Rate: <b className="text-gray-900">₹{emp.hourlyRate}/hr</b>
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star size={13} fill="currentColor" /> {emp.rating}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Employee */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-xs">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-600" /> Add Technical Specialist
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Vendor Agency *</label>
                <select
                  disabled={isVendor}
                  value={form.vendorId}
                  onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium disabled:bg-gray-100"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Full Name *</label>
                <input
                  required
                  placeholder="e.g. Anand Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="emp@technova.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Phone</label>
                  <input
                    placeholder="+91..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Designation / Role</label>
                  <input
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Skills (Comma-separated)</label>
                <input
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                />
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
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
