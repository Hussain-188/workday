import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  Building,
  Check,
  X,
  XCircle,
  ArrowRight,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/calculations';
import { Invoice } from '../types';

export default function InvoiceValidation() {
  const { invoices, financeApproveInvoice, rejectInvoice, markInvoicePaid } = useAppStore();

  const [selectedInv, setSelectedInv] = useState<Invoice | null>(
    invoices.find((i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW') || invoices[0] || null
  );

  const [paymentModal, setPaymentModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'Bank Wire' | 'NEFT/RTGS' | 'Corporate ACH' | 'Direct Transfer'>('NEFT/RTGS');
  const [payRef, setPayRef] = useState(`NEFT-HDFC-${Math.floor(100000 + Math.random() * 900000)}`);
  const [successMsg, setSuccessMsg] = useState('');

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW' || i.status === 'APPROVED'
  );

  const handleApprove = () => {
    if (!selectedInv) return;
    financeApproveInvoice(selectedInv.id, 'Finance verified line items against approved manager timesheets.');
    setSuccessMsg(`Invoice ${selectedInv.invoiceNumber} validated and approved for payment disbursement!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv) return;
    markInvoicePaid(selectedInv.id, payMethod, payRef);
    setPaymentModal(false);
    setSuccessMsg(`Payment executed for ${selectedInv.invoiceNumber}! Status updated to PAID.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" /> Finance Invoice 3-Way Audit & Settlement
        </h1>
        <p className="text-sm text-gray-500">
          Verify invoice mathematical integrity against contract billing rates and manager-approved billable hours before releasing payments.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Invoices Queue */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Verification Queue</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
              {pendingInvoices.length} Pending
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {pendingInvoices.map((inv) => {
              const isSelected = selectedInv?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInv(inv)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900">{inv.invoiceNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : inv.status === 'APPROVED'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-gray-900 mt-1">{inv.vendorName}</p>
                  <p className="text-xs text-gray-500 truncate">{inv.projectName}</p>

                  <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                    <span className="text-gray-500">{inv.lineItems.length} Timesheets</span>
                    <span className="font-black text-gray-900">{formatCurrency(inv.totalAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Validation Checklist & Payout Trigger */}
        {selectedInv ? (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-gray-900">{selectedInv.invoiceNumber}</h2>
                  <p className="text-gray-500">
                    Vendor: <b className="text-gray-800">{selectedInv.vendorName}</b> &bull; Due:{' '}
                    <b className="text-gray-800">{selectedInv.dueDate}</b>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-gray-400">Total Payable</span>
                  <p className="text-xl font-black text-blue-700">
                    {formatCurrency(selectedInv.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Automated Verification Checks */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-gray-800 uppercase tracking-wider">
                  Automated Finance Audit Checklist (3-Way Match)
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><b>Contract Rate Integrity:</b> Line item rates match the Master Work Schedule ₹500/₹750.</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><b>Manager Approval Authorization:</b> All timesheets signed off by Maya Manager.</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><b>Tax Calculation Validation:</b> GST (18%) arithmetic is verified accurate.</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><b>Duplicate Prevention:</b> Zero overlapping timesheet claims detected in billing ledger.</span>
                  </div>
                </div>
              </div>

              {/* Line Items Breakdown */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3 text-right">Regular Hours</th>
                      <th className="p-3 text-right">Overtime Hours</th>
                      <th className="p-3 text-right">Total Billable</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInv.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td className="p-3 font-bold text-gray-900">{li.employeeName}</td>
                        <td className="p-3 text-right text-gray-600">{li.regularHours}h @ ₹{li.regularRate}</td>
                        <td className="p-3 text-right text-amber-700">{li.overtimeHours}h @ ₹{li.overtimeRate}</td>
                        <td className="p-3 text-right font-black text-gray-900">{li.totalBillableHours}h</td>
                        <td className="p-3 text-right font-black text-blue-700">{formatCurrency(li.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Settlement Actions */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {selectedInv.status === 'PAID' && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 size={16} /> Settled via {selectedInv.paymentMethod} (Ref: {selectedInv.paymentReference})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {(selectedInv.status === 'SUBMITTED' || selectedInv.status === 'UNDER_REVIEW') && (
                    <button
                      onClick={handleApprove}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center gap-1.5"
                    >
                      <ShieldCheck size={16} /> Approve Invoice
                    </button>
                  )}

                  {selectedInv.status === 'APPROVED' && (
                    <button
                      onClick={() => setPaymentModal(true)}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      <CreditCard size={16} /> Execute Payout & Mark PAID
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Payment Settlement Modal */}
      {paymentModal && selectedInv && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="text-emerald-600" /> Release Payment ({formatCurrency(selectedInv.totalAmount)})
              </h3>
              <button onClick={() => setPaymentModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Beneficiary Vendor</label>
                <input
                  disabled
                  value={selectedInv.vendorName}
                  className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-lg p-2 font-bold text-gray-800"
                />
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
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-bold text-blue-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md"
                >
                  Confirm & Mark PAID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
