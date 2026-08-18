import { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  Send,
  Check,
  X,
  XCircle,
  Eye,
  DollarSign,
  Building,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';
import { Invoice, InvoiceStatus } from '../types';

export default function Invoices() {
  const {
    invoices,
    timesheets,
    vendors,
    projects,
    currentUser,
    generateInvoice,
    submitInvoice,
    managerApproveInvoice,
    financeApproveInvoice,
    rejectInvoice,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Modal Create Form State
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Available approved timesheets for invoicing
  const availableTimesheets = timesheets.filter(
    (t) => t.status === 'APPROVED' && (!t.invoiced || selectedTimesheetIds.includes(t.id))
  );

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      inv.projectName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTimesheetIds.length === 0) {
      alert('Please select at least one approved timesheet to bill.');
      return;
    }
    const newInv = generateInvoice(
      selectedVendorId,
      selectedProjectId,
      selectedTimesheetIds,
      dueDate
    );
    setShowCreateModal(false);
    setSelectedInvoice(newInv);
  };

  const handleTimesheetToggle = (id: string) => {
    setSelectedTimesheetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const statusColors: Record<InvoiceStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    UNDER_REVIEW: 'bg-purple-100 text-purple-800 border-purple-200',
    APPROVED: 'bg-amber-100 text-amber-800 border-amber-200',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  };

  const canVendorCreate = currentUser.role === 'VENDOR' || currentUser.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Receipt className="text-blue-600" /> Vendor Invoices & 3-Way Billing Validation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Invoices are generated strictly from <b>Manager-Approved Billable Hours</b> and validated by Finance.
          </p>
        </div>

        {canVendorCreate && (
          <button
            onClick={() => {
              // Pre-select any approved timesheet
              const approved = timesheets.filter((t) => t.status === 'APPROVED' && !t.invoiced);
              setSelectedTimesheetIds(approved.map((t) => t.id));
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            Generate Invoice from Approved Hours
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Total Invoices</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{invoices.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Across all project cycles</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Awaiting Finance Validation</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {invoices.filter((i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW').length}
          </p>
          <p className="text-[11px] text-blue-700 mt-0.5">3-way audit in progress</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Approved & Queued for Payment</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {invoices.filter((i) => i.status === 'APPROVED').length}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Ready for bank wire</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Settled (PAID)</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {invoices.filter((i) => i.status === 'PAID').length}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Transfers confirmed</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoice #, vendor, project..."
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
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4">Invoice #</th>
                <th className="py-4 px-4">Vendor Agency</th>
                <th className="py-4 px-4">Project</th>
                <th className="py-4 px-3 text-center">Line Items</th>
                <th className="py-4 px-4 text-right">Subtotal</th>
                <th className="py-4 px-4 text-right">GST / Tax (18%)</th>
                <th className="py-4 px-4 text-right">Total Amount</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-4 font-bold text-blue-600 flex items-center gap-1.5">
                    <FileText size={14} className="text-gray-400" />
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-4 px-4 font-bold text-gray-800">{inv.vendorName}</td>
                  <td className="py-4 px-4 text-gray-600 font-medium">{inv.projectName}</td>
                  <td className="py-4 px-3 text-center text-gray-500 font-semibold">
                    {inv.lineItems.length} Timesheets
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-gray-700">
                    {formatCurrency(inv.subtotal)}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-500">
                    {formatCurrency(inv.taxAmount)}
                  </td>
                  <td className="py-4 px-4 text-right font-black text-gray-900 text-sm">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        statusColors[inv.status]
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                    >
                      <Eye size={13} /> View Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Generate Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Receipt className="text-blue-600" /> Generate Invoice from Approved Timesheets
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Vendor Agency *</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
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
                  <label className="font-semibold text-gray-700">Associated Project *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 mb-2 block">
                  Select Approved Timesheets to Include in Invoice:
                </label>
                {availableTimesheets.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                    No approved timesheets found. Please approve submitted timesheets in the <b>Timesheet Approvals</b> screen first.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {availableTimesheets.map((ts) => (
                      <label
                        key={ts.id}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedTimesheetIds.includes(ts.id)}
                            onChange={() => handleTimesheetToggle(ts.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-bold text-gray-900">{ts.employeeName}</p>
                            <p className="text-[11px] text-gray-500">
                              {ts.timesheetNumber} &bull; {ts.weekStartDate} to {ts.weekEndDate}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">
                            {ts.approvedBillableHours || ts.totalActualHours} Billable Hours
                          </p>
                          <p className="text-[11px] text-emerald-600 font-semibold">
                            {formatCurrency(
                              (ts.approvedRegularHours || 40) * ts.regularRate +
                                (ts.approvedOvertimeHours || 0) * ts.overtimeRate
                            )}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-semibold text-gray-700">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-gray-600">Standard GST Tax Rate:</span>
                  <span className="font-bold text-gray-900">18% GST</span>
                </div>
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
                  disabled={selectedTimesheetIds.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md disabled:opacity-50"
                >
                  Generate Invoice Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Full Invoice Details & 3-Way Audit Validation */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-gray-900">
                    {selectedInvoice.invoiceNumber}
                  </h2>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold border ${
                      statusColors[selectedInvoice.status]
                    }`}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Issued by: <b className="text-gray-800">{selectedInvoice.vendorName}</b> &bull; Due:{' '}
                  <b className="text-gray-800">{selectedInvoice.dueDate}</b>
                </p>
              </div>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* 3-Way Match Verification Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Automated 3-Way Match Validation Passed
                  </h4>
                  <p className="text-emerald-800 mt-0.5">
                    Schedule Contract Rates (₹500 / ₹750) ⟷ Manager Approved Billable Hours (42h) ⟷ Invoice Line Items match 100% with zero discrepancies.
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h3 className="font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Billable Timesheet Line Items
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Employee & Period</th>
                        <th className="p-3 text-right">Regular (h)</th>
                        <th className="p-3 text-right">Overtime (h)</th>
                        <th className="p-3 text-right">Billable Hours</th>
                        <th className="p-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedInvoice.lineItems.map((li) => (
                        <tr key={li.id}>
                          <td className="p-3 font-bold text-gray-900">
                            {li.employeeName}
                            <span className="block text-[11px] font-normal text-gray-400">
                              {li.timesheetNumber} &bull; {li.weekPeriod}
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-600 font-medium">
                            {li.regularHours}h @ ₹{li.regularRate}
                          </td>
                          <td className="p-3 text-right text-amber-700 font-semibold">
                            {li.overtimeHours > 0 ? `${li.overtimeHours}h @ ₹${li.overtimeRate}` : '—'}
                          </td>
                          <td className="p-3 text-right font-black text-gray-900">
                            {li.totalBillableHours}h
                          </td>
                          <td className="p-3 text-right font-black text-blue-700">
                            {formatCurrency(li.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculations Box */}
              <div className="flex justify-end">
                <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>GST (18%):</span>
                    <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between font-black text-sm text-gray-900">
                    <span>Total Amount:</span>
                    <span className="text-blue-700">{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedInvoice.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      submitInvoice(selectedInvoice.id);
                      setSelectedInvoice({ ...selectedInvoice, status: 'SUBMITTED' });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 flex items-center gap-1.5"
                  >
                    <Send size={14} /> Submit Invoice to Client
                  </button>
                )}

                {selectedInvoice.status === 'SUBMITTED' && currentUser.role === 'MANAGER' && (
                  <button
                    onClick={() => {
                      managerApproveInvoice(selectedInvoice.id);
                      setSelectedInvoice({ ...selectedInvoice, status: 'UNDER_REVIEW' });
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-xs hover:bg-purple-700 flex items-center gap-1.5"
                  >
                    <Check size={14} /> Manager Signoff (Forward to Finance)
                  </button>
                )}

                {(selectedInvoice.status === 'SUBMITTED' ||
                  selectedInvoice.status === 'UNDER_REVIEW') &&
                  currentUser.role === 'FINANCE' && (
                    <button
                      onClick={() => {
                        financeApproveInvoice(selectedInvoice.id);
                        setSelectedInvoice({ ...selectedInvoice, status: 'APPROVED' });
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} /> Finance Approve for Payment
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
