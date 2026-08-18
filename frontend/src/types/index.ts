export type Role = 'MANAGER' | 'VENDOR' | 'EMPLOYEE' | 'FINANCE';

export type OvertimePolicy = 'DAILY_AFTER_8' | 'WEEKLY_AFTER_40' | 'NO_OVERTIME';

export type TimesheetStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'RESUBMITTED';

export type InvoiceStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'PAID';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  vendorId?: string;
  vendorName?: string;
  employeeId?: string;
  avatar?: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  tier: 'Preferred' | 'Approved' | 'Standard' | 'Probation';
  status: 'Active' | 'Inactive';
  taxId: string;
  paymentTerms: string;
  address: string;
  activeEmployeesCount?: number;
  totalInvoiced?: number;
  totalPaid?: number;
}

export interface Employee {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  skills: string[];
  status: 'Active' | 'On Leave' | 'Inactive';
  rating: number;
  avatar?: string;
  hourlyRate?: number;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  vendorId: string;
  vendorName: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'Active' | 'Planning' | 'Completed' | 'On Hold';
  description: string;
  assignedEmployeesCount?: number;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  employeeId: string;
  employeeName: string;
  vendorId: string;
  vendorName: string;
  role: string;
  startDate: string;
  endDate: string;
  regularBillingRate: number; // e.g. ₹500
  overtimeRate: number;       // e.g. ₹750
  overtimePolicy: OvertimePolicy;
  status: 'Active' | 'Completed';
}

export interface DaySchedule {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  scheduled: boolean;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "17:00"
  expectedHours: number; // e.g. 8
}

export interface WorkSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  projectName: string;
  weekStartDate: string; // e.g. "2026-08-17"
  weekEndDate: string;   // e.g. "2026-08-21"
  dailySchedule: DaySchedule[];
  totalExpectedHours: number; // 40
  regularRate: number; // ₹500
  overtimeRate: number; // ₹750
  overtimePolicy: OvertimePolicy;
  createdByManager: string;
  createdDate: string;
}

export interface DailyTimeEntry {
  id: string;
  date: string;       // "2026-08-17"
  day: string;        // "Mon"
  scheduledStartTime: string; // "09:00"
  scheduledEndTime: string;   // "17:00"
  scheduledHours: number;     // 8
  
  // Actual employee inputs
  startTime: string;  // "09:00"
  endTime: string;    // "17:30"
  breakMinutes: number; // 30
  workDescription: string;
  
  // Auto-calculated
  actualHours: number; // 8.0
  potentialOvertimeHours: number; // 0.0
  
  // Warnings / Validation
  hasWarning: boolean;
  warningMessage?: string;
  requiresVarianceReason?: boolean;
  varianceReason?: string;
}

export interface Timesheet {
  id: string;
  timesheetNumber: string; // TS-2026-0801
  employeeId: string;
  employeeName: string;
  employeeDesignation?: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  scheduleId: string;
  
  weekStartDate: string; // "2026-08-17"
  weekEndDate: string;   // "2026-08-21"
  
  entries: DailyTimeEntry[];
  
  // Aggregated totals
  totalScheduledHours: number; // 40
  totalActualHours: number;    // 42
  totalPotentialOvertime: number; // 2
  missingHours: number;
  
  // Manager Approval fields
  status: TimesheetStatus;
  approvedRegularHours?: number;  // 40
  approvedOvertimeHours?: number; // 2
  approvedBillableHours?: number; // 42
  rejectedHours?: number;         // 0
  
  regularRate: number;   // ₹500
  overtimeRate: number;  // ₹750
  
  managerComment?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  
  aiFlags?: string[];
  submittedAt?: string;
  invoiced: boolean;
  invoiceId?: string;
}

export interface InvoiceLineItem {
  id: string;
  timesheetId: string;
  timesheetNumber: string;
  employeeName: string;
  weekPeriod: string;
  regularHours: number;
  regularRate: number;
  regularAmount: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  totalBillableHours: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-001
  vendorId: string;
  vendorName: string;
  projectId: string;
  projectName: string;
  
  weekOrPeriod: string; // "Aug 17 - Aug 21, 2026"
  issueDate: string;
  dueDate: string;
  
  lineItems: InvoiceLineItem[];
  
  subtotal: number;
  taxRate: number; // 18% GST/Tax
  taxAmount: number;
  totalAmount: number;
  
  status: InvoiceStatus;
  
  // Validation flags & checks
  systemValidationPassed: boolean;
  validationIssues?: string[];
  
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  managerComments?: string;
  
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  financeComments?: string;
  rejectionReason?: string;
  
  paymentMethod?: 'Bank Wire' | 'NEFT/RTGS' | 'Corporate ACH' | 'Direct Transfer';
  paymentReference?: string;
  paidAt?: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  status: 'SUCCESS' | 'PROCESSING';
  notes: string;
}
