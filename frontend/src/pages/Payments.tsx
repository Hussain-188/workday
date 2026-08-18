import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Building,
  DollarSign,
  FileText,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';

export default function Payments() {
  const { payments, invoices, currentUser, markInvoicePaid } = useAppStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const approvedInvoices = invoices.filter((i) => i.status === 'APPROVED');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(approvedInvoices[0]?.id || '');
  const [payMethod, setPayMethod] = useState<'Bank Wire' | 'NEFT/RTGS' | 'Corporate ACH' | 'Direct Transfer'>('NEFT/RTGS');
  const [reference, setReference] = useState(`NEFT-AXIS-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');

  const isFinance = currentUser.role === 'FINANCE' || currentUser.role === 'MANAGER';

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    markInvoicePaid(selectedInvoiceId, payMethod, reference, notes);
    setShowModal(false);
  };

  const filtered = payments.filter(
    (p) =>
      p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totalDisbursed = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="text-emerald-600" /> Outbound Vendor Disbursements & Payments
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit confirmed bank wire transfers, NEFT/RTGS clearances, and vendor payment receipts.
          </p>
        </div>

        {isFinance && approvedInvoices.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            Record Payment Settlement ({approvedInvoices.length} Approved Invoices)
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Total Capital Settled</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalDisbursed)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Cleared vendor invoices</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Executed Transactions</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{payments.length} Settlements</p>
          <p className="text-[11px] text-blue-700 mt-0.5">NEFT / RTGS & Bank Wire</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">Average Payout Amount</p>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {formatCurrency(payments.length ? totalDisbursed / payments.length : 0)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Per sprint billing cycle</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reference, invoice #, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4">Transaction Ref</th>
                <th className="py-4 px-4">Invoice Cleared</th>
                <th className="py-4 px-4">Beneficiary Vendor</th>
                <th className="py-4 px-4">Payment Method</th>
                <th className="py-4 px-4 text-right">Settled Amount</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-4 px-4 font-bold text-gray-900">{p.referenceNumber}</td>
                  <td className="py-4 px-4 font-bold text-blue-600 flex items-center gap-1">
                    <FileText size={14} className="text-gray-400" />
                    {p.invoiceNumber}
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-800">{p.vendorName}</td>
                  <td className="py-4 px-4 text-gray-600">{p.paymentMethod}</td>
                  <td className="py-4 px-4 text-right font-black text-emerald-600 text-sm">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={12} /> {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-500 truncate max-w-xs">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="text-emerald-600" /> Record Invoice Settlement
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleRecord} className="space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Select Approved Invoice *</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                >
                  {approvedInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.vendorName} ({formatCurrency(inv.totalAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Payment Gateway / Route</label>
                <select
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-medium"
                >
                  <option value="NEFT/RTGS">NEFT / RTGS Corporate Direct</option>
                  <option value="Bank Wire">Bank Wire Transfer</option>
                  <option value="Corporate ACH">Corporate ACH Settlement</option>
                  <option value="Direct Transfer">IMPS Instant Transfer</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Transaction Reference ID *</label>
                <input
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">Audit Memo / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
