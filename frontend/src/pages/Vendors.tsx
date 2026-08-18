import { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  Briefcase,
  Receipt,
  CheckCircle2,
  Star,
  X,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';
import { Vendor } from '../types';

export default function Vendors() {
  const { vendors, employees, projects, addVendor } = useAppStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    contactName: '',
    email: '',
    phone: '',
    tier: 'Preferred' as 'Preferred' | 'Approved' | 'Standard' | 'Probation',
    status: 'Active' as 'Active' | 'Inactive',
    taxId: '',
    paymentTerms: 'Net 30',
    address: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    addVendor({
      ...form,
    });
    setShowModal(false);
  };

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contactName.toLowerCase().includes(search.toLowerCase()) ||
      v.taxId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-blue-600" /> Vendor Agency Partners
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your registered staffing agencies, consulting partners, SLA compliance, and tier classifications.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus size={16} />
          Onboard New Vendor Agency
        </button>
      </div>

      {/* Vendor Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((v) => {
          const vendorEmps = employees.filter((e) => e.vendorId === v.id);
          const vendorProjs = projects.filter((p) => p.vendorId === v.id);

          return (
            <div
              key={v.id}
              onClick={() => setSelectedVendor(v)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {v.code}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {v.tier} Partner
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900">{v.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail size={12} /> {v.email}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone size={12} /> {v.phone}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Active Specialists:</span>
                    <span className="font-bold text-gray-800">{vendorEmps.length} Employees</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Associated Projects:</span>
                    <span className="font-bold text-gray-800">{vendorProjs.length} Client Projects</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Total Disbursed:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(v.totalPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Payment Terms:</span>
                    <span className="font-semibold text-gray-800">{v.paymentTerms}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Tax ID: {v.taxId}</span>
                <span className="text-blue-600 font-bold hover:underline">View Details &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Onboard Vendor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-xs">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="text-blue-600" /> Onboard Vendor Agency
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Vendor Legal Name *</label>
                  <input
                    required
                    placeholder="e.g. Apex Staffing Solutions Pvt Ltd"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Vendor Code *</label>
                  <input
                    required
                    placeholder="e.g. APEX-01"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Account Manager Contact *</label>
                  <input
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="billing@vendor.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Tax / GSTIN Number</label>
                  <input
                    placeholder="GSTIN..."
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Supplier Tier</label>
                  <select
                    value={form.tier}
                    onChange={(e: any) => setForm({ ...form, tier: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  >
                    <option value="Preferred">Preferred Partner</option>
                    <option value="Approved">Approved</option>
                    <option value="Standard">Standard</option>
                    <option value="Probation">Probation</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Payment Terms</label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Registered Office Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                  Onboard Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Vendor Details */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {selectedVendor.code}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedVendor.name}</h2>
                <p className="text-gray-500">Contact: {selectedVendor.contactName} ({selectedVendor.email})</p>
              </div>
              <button onClick={() => setSelectedVendor(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 uppercase tracking-wider">
                Assigned Specialists Under This Vendor
              </h3>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {employees
                  .filter((e) => e.vendorId === selectedVendor.id)
                  .map((emp) => (
                    <div key={emp.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{emp.name}</p>
                        <p className="text-[11px] text-gray-500">{emp.designation} &bull; Rate: ₹{emp.hourlyRate}/hr</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                        {emp.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedVendor(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
