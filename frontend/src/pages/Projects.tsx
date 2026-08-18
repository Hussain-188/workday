import { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Building,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  X,
  UserPlus,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';
import { OvertimePolicy, Project } from '../types';

export default function Projects() {
  const {
    projects,
    vendors,
    employees,
    assignments,
    currentUser,
    addProject,
    assignEmployeeToProject,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');

  // Create Project Form State
  const [pForm, setPForm] = useState({
    name: 'Core Banking API Overhaul',
    code: 'BANK-2026-04',
    client: 'Apex Financial Services',
    vendorId: vendors[0]?.id || '',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    budget: 3500000,
    description: 'High availability financial microservices and instant clearing engine.',
  });

  // Assign Employee Form State
  const [aForm, setAForm] = useState({
    employeeId: employees[0]?.id || '',
    role: 'Senior Backend Engineer',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    regularBillingRate: 500,
    overtimeRate: 750,
    overtimePolicy: 'DAILY_AFTER_8' as OvertimePolicy,
  });

  const isManager = currentUser.role === 'MANAGER';

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === pForm.vendorId);
    addProject({
      name: pForm.name,
      code: pForm.code,
      client: pForm.client,
      vendorId: pForm.vendorId,
      vendorName: vendor?.name || 'Vendor',
      startDate: pForm.startDate,
      endDate: pForm.endDate,
      budget: Number(pForm.budget),
      status: 'Active',
      description: pForm.description,
    });
    setShowCreateModal(false);
  };

  const handleAssignEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === aForm.employeeId);
    const proj = projects.find((x) => x.id === selectedProjectId);
    if (!emp || !proj) return;

    assignEmployeeToProject({
      projectId: proj.id,
      projectName: proj.name,
      projectCode: proj.code,
      employeeId: emp.id,
      employeeName: emp.name,
      vendorId: emp.vendorId,
      vendorName: emp.vendorName,
      role: aForm.role,
      startDate: aForm.startDate,
      endDate: aForm.endDate,
      regularBillingRate: Number(aForm.regularBillingRate),
      overtimeRate: Number(aForm.overtimeRate),
      overtimePolicy: aForm.overtimePolicy,
      status: 'Active',
    });
    setShowAssignModal(false);
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase className="text-blue-600" /> Project Management & Employee Assignments
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create client initiatives, assign vendor talent, define regular rates, and configure overtime policies.
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 shadow-sm"
            >
              <UserPlus size={15} /> Assign Employee
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              <Plus size={15} /> Create Project
            </button>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((proj) => {
          const projAssignments = assignments.filter((a) => a.projectId === proj.id);
          return (
            <div
              key={proj.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {proj.code}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {proj.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900">{proj.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Client: {proj.client}</p>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2">{proj.description}</p>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Vendor Partner:</span>
                    <span className="font-bold text-gray-800">{proj.vendorName}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Approved Budget:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(proj.budget)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Assigned Talent:</span>
                    <span className="font-bold text-blue-700">{projAssignments.length} Specialists</span>
                  </div>
                </div>

                {/* Assigned Employees List */}
                {projAssignments.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Deployed Specialists
                    </p>
                    <div className="space-y-1.5">
                      {projAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 text-xs"
                        >
                          <span className="font-bold text-gray-800">{a.employeeName}</span>
                          <span className="text-[11px] font-semibold text-emerald-600">
                            ₹{a.regularBillingRate}/h (OT: ₹{a.overtimeRate}/h)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isManager && (
                <button
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setShowAssignModal(true);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <UserPlus size={13} /> Add Specialist Assignment
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-xs">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Briefcase className="text-blue-600" /> Create Client Project
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Project Name *</label>
                <input
                  required
                  value={pForm.name}
                  onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Project Code *</label>
                  <input
                    required
                    value={pForm.code}
                    onChange={(e) => setPForm({ ...pForm, code: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Client Organization *</label>
                  <input
                    required
                    value={pForm.client}
                    onChange={(e) => setPForm({ ...pForm, client: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Primary Vendor Partner *</label>
                  <select
                    value={pForm.vendorId}
                    onChange={(e) => setPForm({ ...pForm, vendorId: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Total Budget (₹)</label>
                  <input
                    type="number"
                    value={pForm.budget}
                    onChange={(e) => setPForm({ ...pForm, budget: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Description & Deliverables</label>
                <textarea
                  rows={2}
                  value={pForm.description}
                  onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Employee */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-xs">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <UserPlus className="text-blue-600" /> Assign Specialist to Project
              </h3>
              <button onClick={() => setShowAssignModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAssignEmployee} className="p-6 space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Select Project *</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Select Employee *</label>
                  <select
                    value={aForm.employeeId}
                    onChange={(e) => setAForm({ ...aForm, employeeId: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.vendorName.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Project Role</label>
                  <input
                    value={aForm.role}
                    onChange={(e) => setAForm({ ...aForm, role: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Regular Billing Rate (₹/hr) *</label>
                  <input
                    type="number"
                    required
                    value={aForm.regularBillingRate}
                    onChange={(e) =>
                      setAForm({ ...aForm, regularBillingRate: Number(e.target.value) })
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Overtime Rate (₹/hr) *</label>
                  <input
                    type="number"
                    required
                    value={aForm.overtimeRate}
                    onChange={(e) =>
                      setAForm({ ...aForm, overtimeRate: Number(e.target.value) })
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Overtime Policy</label>
                <select
                  value={aForm.overtimePolicy}
                  onChange={(e) =>
                    setAForm({ ...aForm, overtimePolicy: e.target.value as OvertimePolicy })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                >
                  <option value="DAILY_AFTER_8">Daily Overtime After 8h</option>
                  <option value="WEEKLY_AFTER_40">Weekly Overtime After 40h</option>
                  <option value="NO_OVERTIME">No Overtime (Flat)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md"
                >
                  Assign to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
