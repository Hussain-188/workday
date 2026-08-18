import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Vendor,
  Employee,
  Project,
  ProjectAssignment,
  WorkSchedule,
  Timesheet,
  Invoice,
  PaymentRecord,
  Role,
  TimesheetStatus,
  InvoiceStatus,
  DailyTimeEntry,
} from '../types';

// Initial Mock Data
const initialVendors: Vendor[] = [
  {
    id: 'ven-1',
    name: 'TechNova Solutions Pvt Ltd',
    code: 'TECH-NOVA',
    contactName: 'Suresh Menon',
    email: 'suresh@technovasolutions.com',
    phone: '+91 98450 12345',
    tier: 'Preferred',
    status: 'Active',
    taxId: 'GSTIN29AAACT9821R1Z8',
    paymentTerms: 'Net 30',
    address: 'Embassy Tech Village, Outer Ring Road, Bengaluru, Karnataka 560103',
    activeEmployeesCount: 3,
    totalInvoiced: 485000,
    totalPaid: 320000,
  },
  {
    id: 'ven-2',
    name: 'CloudScale Consulting Corp',
    code: 'CLOUD-SCALE',
    contactName: 'Ananya Sharma',
    email: 'ananya@cloudscale.io',
    phone: '+91 98800 54321',
    tier: 'Preferred',
    status: 'Active',
    taxId: 'GSTIN27AABCS4420M1Z2',
    paymentTerms: 'Net 30',
    address: 'Mindspace Cyber City, HITEC City, Hyderabad, Telangana 500081',
    activeEmployeesCount: 2,
    totalInvoiced: 620000,
    totalPaid: 450000,
  },
  {
    id: 'ven-3',
    name: 'PixelCraft Design Labs',
    code: 'PIXEL-CRAFT',
    contactName: 'Rohit Verma',
    email: 'rohit@pixelcraft.design',
    phone: '+91 99201 88776',
    tier: 'Approved',
    status: 'Active',
    taxId: 'GSTIN07AAACR3310P1Z4',
    paymentTerms: 'Net 15',
    address: 'Cyber Hub, DLF Phase 2, Gurugram, Haryana 122002',
    activeEmployeesCount: 1,
    totalInvoiced: 210000,
    totalPaid: 210000,
  },
];

const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    name: 'Ravi Kumar',
    email: 'ravi.kumar@technova.com',
    phone: '+91 97412 34567',
    designation: 'Senior Backend Engineer',
    skills: ['Java', 'Spring Boot', 'Microservices', 'PostgreSQL', 'Kafka'],
    status: 'Active',
    rating: 4.9,
    hourlyRate: 500,
  },
  {
    id: 'emp-2',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    name: 'Priya Sundaram',
    email: 'priya.s@technova.com',
    phone: '+91 98401 23456',
    designation: 'Full Stack React Engineer',
    skills: ['React', 'TypeScript', 'Node.js', 'TailwindCSS', 'GraphQL'],
    status: 'Active',
    rating: 4.8,
    hourlyRate: 550,
  },
  {
    id: 'emp-3',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    name: 'Arjun Das',
    email: 'arjun.das@technova.com',
    phone: '+91 99887 65432',
    designation: 'Cloud Infrastructure Specialist',
    skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'Linux'],
    status: 'Active',
    rating: 4.7,
    hourlyRate: 650,
  },
  {
    id: 'emp-4',
    vendorId: 'ven-2',
    vendorName: 'CloudScale Consulting Corp',
    name: 'Sneha Patel',
    email: 'sneha.p@cloudscale.io',
    phone: '+91 98250 99887',
    designation: 'DevOps & SRE Engineer',
    skills: ['CI/CD', 'Prometheus', 'Grafana', 'GCP', 'Ansible'],
    status: 'Active',
    rating: 4.9,
    hourlyRate: 700,
  },
  {
    id: 'emp-5',
    vendorId: 'ven-3',
    vendorName: 'PixelCraft Design Labs',
    name: 'Vikram Joshi',
    email: 'vikram@pixelcraft.design',
    phone: '+91 99300 11223',
    designation: 'Lead UI/UX Designer',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
    status: 'Active',
    rating: 4.8,
    hourlyRate: 600,
  },
];

const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Banking Modernization Platform',
    code: 'BANK-2026-01',
    client: 'Global Apex Bank',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    budget: 2500000,
    status: 'Active',
    description: 'Core banking microservices transformation, real-time UPI switch integration, and PCI-DSS compliant payment gateway redesign.',
    assignedEmployeesCount: 2,
  },
  {
    id: 'proj-2',
    name: 'NextGen Mobile Retail Banking',
    code: 'MOB-2026-02',
    client: 'FinTech Horizons',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    startDate: '2026-08-10',
    endDate: '2026-11-30',
    budget: 1800000,
    status: 'Active',
    description: 'React Native high-performance mobile application with biometric auth, cardless ATM withdrawal, and wealth management dashboard.',
    assignedEmployeesCount: 1,
  },
  {
    id: 'proj-3',
    name: 'Multi-Cloud Infrastructure Automation',
    code: 'CLOUD-2026-03',
    client: 'Enterprise Cloud Systems',
    vendorId: 'ven-2',
    vendorName: 'CloudScale Consulting Corp',
    startDate: '2026-07-01',
    endDate: '2027-01-31',
    budget: 3200000,
    status: 'Active',
    description: 'Zero-trust architecture rollout across AWS and GCP with automated canary deployments and 99.99% uptime guarantees.',
    assignedEmployeesCount: 1,
  },
];

const initialAssignments: ProjectAssignment[] = [
  {
    id: 'asg-1',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    projectCode: 'BANK-2026-01',
    employeeId: 'emp-1',
    employeeName: 'Ravi Kumar',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    role: 'Senior Backend Architect',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    regularBillingRate: 500, // ₹500/hr
    overtimeRate: 750,       // ₹750/hr
    overtimePolicy: 'DAILY_AFTER_8',
    status: 'Active',
  },
  {
    id: 'asg-2',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    projectCode: 'BANK-2026-01',
    employeeId: 'emp-2',
    employeeName: 'Priya Sundaram',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    role: 'Lead UI Integration Engineer',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    regularBillingRate: 550,
    overtimeRate: 825,
    overtimePolicy: 'DAILY_AFTER_8',
    status: 'Active',
  },
  {
    id: 'asg-3',
    projectId: 'proj-2',
    projectName: 'NextGen Mobile Retail Banking',
    projectCode: 'MOB-2026-02',
    employeeId: 'emp-3',
    employeeName: 'Arjun Das',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    role: 'Cloud Security Engineer',
    startDate: '2026-08-10',
    endDate: '2026-11-30',
    regularBillingRate: 650,
    overtimeRate: 975,
    overtimePolicy: 'DAILY_AFTER_8',
    status: 'Active',
  },
  {
    id: 'asg-4',
    projectId: 'proj-3',
    projectName: 'Multi-Cloud Infrastructure Automation',
    projectCode: 'CLOUD-2026-03',
    employeeId: 'emp-4',
    employeeName: 'Sneha Patel',
    vendorId: 'ven-2',
    vendorName: 'CloudScale Consulting Corp',
    role: 'Senior SRE Lead',
    startDate: '2026-07-01',
    endDate: '2027-01-31',
    regularBillingRate: 700,
    overtimeRate: 1050,
    overtimePolicy: 'DAILY_AFTER_8',
    status: 'Active',
  },
];

const initialSchedules: WorkSchedule[] = [
  {
    id: 'sch-1',
    employeeId: 'emp-1',
    employeeName: 'Ravi Kumar',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    weekStartDate: '2026-08-17',
    weekEndDate: '2026-08-21',
    dailySchedule: [
      { day: 'Mon', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Tue', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Wed', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Thu', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Fri', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
    ],
    totalExpectedHours: 40,
    regularRate: 500,
    overtimeRate: 750,
    overtimePolicy: 'DAILY_AFTER_8',
    createdByManager: 'Maya Manager (Director of Engineering)',
    createdDate: '2026-08-14',
  },
  {
    id: 'sch-2',
    employeeId: 'emp-2',
    employeeName: 'Priya Sundaram',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    weekStartDate: '2026-08-17',
    weekEndDate: '2026-08-21',
    dailySchedule: [
      { day: 'Mon', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Tue', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Wed', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Thu', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Fri', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
    ],
    totalExpectedHours: 40,
    regularRate: 550,
    overtimeRate: 825,
    overtimePolicy: 'DAILY_AFTER_8',
    createdByManager: 'Maya Manager (Director of Engineering)',
    createdDate: '2026-08-14',
  },
  {
    id: 'sch-3',
    employeeId: 'emp-3',
    employeeName: 'Arjun Das',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-2',
    projectName: 'NextGen Mobile Retail Banking',
    weekStartDate: '2026-08-17',
    weekEndDate: '2026-08-21',
    dailySchedule: [
      { day: 'Mon', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Tue', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Wed', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Thu', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
      { day: 'Fri', scheduled: true, startTime: '09:00', endTime: '17:00', expectedHours: 8 },
    ],
    totalExpectedHours: 40,
    regularRate: 650,
    overtimeRate: 975,
    overtimePolicy: 'DAILY_AFTER_8',
    createdByManager: 'Maya Manager (Director of Engineering)',
    createdDate: '2026-08-14',
  },
];

const initialTimesheets: Timesheet[] = [
  {
    id: 'ts-1',
    timesheetNumber: 'TS-2026-0801',
    employeeId: 'emp-1',
    employeeName: 'Ravi Kumar',
    employeeDesignation: 'Senior Backend Engineer',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    projectCode: 'BANK-2026-01',
    scheduleId: 'sch-1',
    weekStartDate: '2026-08-17',
    weekEndDate: '2026-08-21',
    entries: [
      {
        id: 'entry-1',
        date: '2026-08-17',
        day: 'Mon',
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        scheduledHours: 8,
        startTime: '09:00',
        endTime: '17:30',
        breakMinutes: 30,
        workDescription: 'API development & PostgreSQL connection pooling',
        actualHours: 8.0,
        potentialOvertimeHours: 0.0,
        hasWarning: false,
      },
      {
        id: 'entry-2',
        date: '2026-08-18',
        day: 'Tue',
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        scheduledHours: 8,
        startTime: '09:00',
        endTime: '17:30',
        breakMinutes: 30,
        workDescription: 'Bug fixes in account balance validation endpoints',
        actualHours: 8.0,
        potentialOvertimeHours: 0.0,
        hasWarning: false,
      },
      {
        id: 'entry-3',
        date: '2026-08-19',
        day: 'Wed',
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        scheduledHours: 8,
        startTime: '09:00',
        endTime: '18:30',
        breakMinutes: 30,
        workDescription: 'Integration testing with core payment gateway simulator',
        actualHours: 9.0,
        potentialOvertimeHours: 1.0,
        hasWarning: true,
        warningMessage: 'Wednesday exceeded schedule by 1h overtime',
      },
      {
        id: 'entry-4',
        date: '2026-08-20',
        day: 'Thu',
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        scheduledHours: 8,
        startTime: '09:00',
        endTime: '17:30',
        breakMinutes: 30,
        workDescription: 'API Swagger documentation and schema security review',
        actualHours: 8.0,
        potentialOvertimeHours: 0.0,
        hasWarning: false,
      },
      {
        id: 'entry-5',
        date: '2026-08-21',
        day: 'Fri',
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        scheduledHours: 8,
        startTime: '09:00',
        endTime: '18:30',
        breakMinutes: 30,
        workDescription: 'Production sprint release support and telemetry verification',
        actualHours: 9.0,
        potentialOvertimeHours: 1.0,
        hasWarning: true,
        warningMessage: 'Friday exceeded schedule by 1h overtime',
      },
    ],
    totalScheduledHours: 40,
    totalActualHours: 42,
    totalPotentialOvertime: 2,
    missingHours: 0,
    status: 'SUBMITTED',
    regularRate: 500,
    overtimeRate: 750,
    aiFlags: [
      '⚠ Wednesday exceeded schedule by 1h',
      '⚠ Friday exceeded schedule by 1h',
      '✨ Overtime is 35% above Ravi\'s 4-week average (Late sprint release verified)',
    ],
    submittedAt: '2026-08-21T18:45:00Z',
    invoiced: false,
  },
  {
    id: 'ts-2',
    timesheetNumber: 'TS-2026-0802',
    employeeId: 'emp-2',
    employeeName: 'Priya Sundaram',
    employeeDesignation: 'Full Stack React Engineer',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    projectCode: 'BANK-2026-01',
    scheduleId: 'sch-2',
    weekStartDate: '2026-08-17',
    weekEndDate: '2026-08-21',
    entries: [
      { id: 'p1', date: '2026-08-17', day: 'Mon', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'Cardless cash withdrawal screen components', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'p2', date: '2026-08-18', day: 'Tue', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'Transaction history virtualization and filters', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'p3', date: '2026-08-19', day: 'Wed', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'Biometric fingerprint login hooks', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'p4', date: '2026-08-20', day: 'Thu', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'Accessibility audit & keyboard navigation testing', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'p5', date: '2026-08-21', day: 'Fri', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'End-to-end Cypress UI regression test suite', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
    ],
    totalScheduledHours: 40,
    totalActualHours: 40,
    totalPotentialOvertime: 0,
    missingHours: 0,
    status: 'APPROVED',
    approvedRegularHours: 40,
    approvedOvertimeHours: 0,
    approvedBillableHours: 40,
    rejectedHours: 0,
    regularRate: 550,
    overtimeRate: 825,
    managerComment: 'Flawless execution on the accessibility components. Approved for invoicing.',
    reviewedBy: 'Maya Manager',
    reviewedAt: '2026-08-22T10:30:00Z',
    submittedAt: '2026-08-21T18:00:00Z',
    invoiced: true,
    invoiceId: 'inv-1',
  },
  {
    id: 'ts-3',
    timesheetNumber: 'TS-2026-0803',
    employeeId: 'emp-3',
    employeeName: 'Arjun Das',
    employeeDesignation: 'Cloud Security Engineer',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-2',
    projectName: 'NextGen Mobile Retail Banking',
    projectCode: 'MOB-2026-02',
    scheduleId: 'sch-3',
    weekStartDate: '2026-08-17',
    weekEndDate: '2026-08-21',
    entries: [
      { id: 'a1', date: '2026-08-17', day: 'Mon', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'AWS KMS key rotation setup', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'a2', date: '2026-08-18', day: 'Tue', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'Security Hub remediation', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'a3', date: '2026-08-19', day: 'Wed', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'EKS cluster upgrade preparation', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'a4', date: '2026-08-20', day: 'Thu', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '09:00', endTime: '17:30', breakMinutes: 30, workDescription: 'Penetration testing fixes', actualHours: 8, potentialOvertimeHours: 0, hasWarning: false },
      { id: 'a5', date: '2026-08-21', day: 'Fri', scheduledStartTime: '09:00', scheduledEndTime: '17:00', scheduledHours: 8, startTime: '00:00', endTime: '00:00', breakMinutes: 0, workDescription: '', actualHours: 0, potentialOvertimeHours: 0, hasWarning: true, warningMessage: 'Missing Friday time entry' },
    ],
    totalScheduledHours: 40,
    totalActualHours: 32,
    totalPotentialOvertime: 0,
    missingHours: 8,
    status: 'DRAFT',
    regularRate: 650,
    overtimeRate: 975,
    invoiced: false,
  },
];

const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    weekOrPeriod: 'Aug 10 - Aug 14, 2026',
    issueDate: '2026-08-16',
    dueDate: '2026-09-15',
    lineItems: [
      {
        id: 'li-1',
        timesheetId: 'ts-prev-1',
        timesheetNumber: 'TS-2026-0749',
        employeeName: 'Ravi Kumar',
        weekPeriod: 'Aug 10 - Aug 14, 2026',
        regularHours: 40,
        regularRate: 500,
        regularAmount: 20000,
        overtimeHours: 0,
        overtimeRate: 750,
        overtimeAmount: 0,
        totalBillableHours: 40,
        totalAmount: 20000,
      },
      {
        id: 'li-2',
        timesheetId: 'ts-2',
        timesheetNumber: 'TS-2026-0802',
        employeeName: 'Priya Sundaram',
        weekPeriod: 'Aug 17 - Aug 21, 2026',
        regularHours: 40,
        regularRate: 550,
        regularAmount: 22000,
        overtimeHours: 0,
        overtimeRate: 825,
        overtimeAmount: 0,
        totalBillableHours: 40,
        totalAmount: 22000,
      },
    ],
    subtotal: 42000,
    taxRate: 18,
    taxAmount: 7560,
    totalAmount: 49560,
    status: 'SUBMITTED',
    systemValidationPassed: true,
    validationIssues: [],
    managerApprovedBy: 'Maya Manager',
    managerApprovedAt: '2026-08-18T11:00:00Z',
    managerComments: 'All billable hours verified against timesheet approvals.',
  },
  {
    id: 'inv-prev',
    invoiceNumber: 'INV-2026-000',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    projectId: 'proj-1',
    projectName: 'Banking Modernization Platform',
    weekOrPeriod: 'Aug 03 - Aug 07, 2026',
    issueDate: '2026-08-09',
    dueDate: '2026-09-08',
    lineItems: [
      {
        id: 'li-0',
        timesheetId: 'ts-old-1',
        timesheetNumber: 'TS-2026-0710',
        employeeName: 'Ravi Kumar',
        weekPeriod: 'Aug 03 - Aug 07, 2026',
        regularHours: 40,
        regularRate: 500,
        regularAmount: 20000,
        overtimeHours: 2,
        overtimeRate: 750,
        overtimeAmount: 1500,
        totalBillableHours: 42,
        totalAmount: 21500,
      },
    ],
    subtotal: 21500,
    taxRate: 18,
    taxAmount: 3870,
    totalAmount: 25370,
    status: 'PAID',
    systemValidationPassed: true,
    managerApprovedBy: 'Maya Manager',
    managerApprovedAt: '2026-08-10T14:00:00Z',
    financeApprovedBy: 'Frank Finance',
    financeApprovedAt: '2026-08-11T16:30:00Z',
    paymentMethod: 'Bank Wire',
    paymentReference: 'NEFT-AXIS-98321044',
    paidAt: '2026-08-12T10:00:00Z',
  },
];

const initialPayments: PaymentRecord[] = [
  {
    id: 'pay-1',
    invoiceId: 'inv-prev',
    invoiceNumber: 'INV-2026-000',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    amount: 25370,
    paymentDate: '2026-08-12',
    paymentMethod: 'NEFT/RTGS',
    referenceNumber: 'NEFT-AXIS-98321044',
    status: 'SUCCESS',
    notes: 'Settled sprint 1 deliverables for Banking Modernization project.',
  },
];

// Preset Demo Users
export const demoUsers: Record<Role, User> = {
  MANAGER: {
    id: 'user-manager',
    name: 'Maya Manager',
    email: 'manager@vendormgmt.com',
    role: 'MANAGER',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  VENDOR: {
    id: 'user-vendor',
    name: 'Suresh Menon (TechNova)',
    email: 'vendor@technova.com',
    role: 'VENDOR',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  },
  EMPLOYEE: {
    id: 'user-employee',
    name: 'Ravi Kumar',
    email: 'ravi.kumar@technova.com',
    role: 'EMPLOYEE',
    vendorId: 'ven-1',
    vendorName: 'TechNova Solutions Pvt Ltd',
    employeeId: 'emp-1',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  FINANCE: {
    id: 'user-finance',
    name: 'Frank Finance',
    email: 'finance@vendormgmt.com',
    role: 'FINANCE',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
};

interface AppState {
  // Current session user
  currentUser: User;
  switchRole: (role: Role) => void;

  // Master Data
  vendors: Vendor[];
  employees: Employee[];
  projects: Project[];
  assignments: ProjectAssignment[];
  schedules: WorkSchedule[];
  timesheets: Timesheet[];
  invoices: Invoice[];
  payments: PaymentRecord[];

  // Vendor actions
  addVendor: (vendor: Omit<Vendor, 'id'>) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;

  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;

  // Project & Assignment actions
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  assignEmployeeToProject: (assignment: Omit<ProjectAssignment, 'id'>) => void;

  // Schedule actions
  createSchedule: (schedule: Omit<WorkSchedule, 'id' | 'createdDate'>) => void;

  // Timesheet actions
  createOrUpdateTimesheet: (timesheet: Partial<Timesheet>) => void;
  submitTimesheet: (id: string) => void;
  approveTimesheet: (
    id: string,
    regularHours: number,
    overtimeHours: number,
    comment?: string
  ) => void;
  rejectTimesheet: (id: string, reason: string) => void;

  // Invoice actions
  generateInvoice: (
    vendorId: string,
    projectId: string,
    timesheetIds: string[],
    dueDate: string
  ) => Invoice;
  submitInvoice: (id: string) => void;
  managerApproveInvoice: (id: string, comments?: string) => void;
  financeApproveInvoice: (id: string, comments?: string) => void;
  rejectInvoice: (id: string, reason: string) => void;
  markInvoicePaid: (
    invoiceId: string,
    paymentMethod: 'Bank Wire' | 'NEFT/RTGS' | 'Corporate ACH' | 'Direct Transfer',
    referenceNumber: string,
    notes?: string
  ) => void;

  // Reset to original mock data
  resetMockData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: demoUsers.MANAGER,
      switchRole: (role: Role) => set({ currentUser: demoUsers[role] }),

      vendors: initialVendors,
      employees: initialEmployees,
      projects: initialProjects,
      assignments: initialAssignments,
      schedules: initialSchedules,
      timesheets: initialTimesheets,
      invoices: initialInvoices,
      payments: initialPayments,

      addVendor: (v) =>
        set((state) => ({
          vendors: [
            ...state.vendors,
            { ...v, id: `ven-${Date.now()}`, activeEmployeesCount: 0, totalInvoiced: 0, totalPaid: 0 },
          ],
        })),

      updateVendor: (id, v) =>
        set((state) => ({
          vendors: state.vendors.map((item) => (item.id === id ? { ...item, ...v } : item)),
        })),

      addEmployee: (e) =>
        set((state) => ({
          employees: [...state.employees, { ...e, id: `emp-${Date.now()}` }],
        })),

      updateEmployee: (id, e) =>
        set((state) => ({
          employees: state.employees.map((item) => (item.id === id ? { ...item, ...e } : item)),
        })),

      addProject: (p) =>
        set((state) => ({
          projects: [...state.projects, { ...p, id: `proj-${Date.now()}`, assignedEmployeesCount: 0 }],
        })),

      updateProject: (id, p) =>
        set((state) => ({
          projects: state.projects.map((item) => (item.id === id ? { ...item, ...p } : item)),
        })),

      assignEmployeeToProject: (a) =>
        set((state) => {
          const newAssignment = { ...a, id: `asg-${Date.now()}` };
          // Increment assigned count on project
          const updatedProjects = state.projects.map((p) =>
            p.id === a.projectId
              ? { ...p, assignedEmployeesCount: (p.assignedEmployeesCount || 0) + 1 }
              : p
          );
          return {
            assignments: [...state.assignments, newAssignment],
            projects: updatedProjects,
          };
        }),

      createSchedule: (s) =>
        set((state) => ({
          schedules: [
            ...state.schedules,
            {
              ...s,
              id: `sch-${Date.now()}`,
              createdDate: new Date().toISOString().split('T')[0],
            },
          ],
        })),

      createOrUpdateTimesheet: (ts) =>
        set((state) => {
          if (ts.id && state.timesheets.some((t) => t.id === ts.id)) {
            return {
              timesheets: state.timesheets.map((t) =>
                t.id === ts.id ? ({ ...t, ...ts } as Timesheet) : t
              ),
            };
          } else {
            const newTs: Timesheet = {
              ...(ts as Timesheet),
              id: ts.id || `ts-${Date.now()}`,
              timesheetNumber: ts.timesheetNumber || `TS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              status: ts.status || 'DRAFT',
              invoiced: false,
            };
            return { timesheets: [newTs, ...state.timesheets] };
          }
        }),

      submitTimesheet: (id) =>
        set((state) => ({
          timesheets: state.timesheets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'SUBMITTED' as TimesheetStatus,
                  submittedAt: new Date().toISOString(),
                }
              : t
          ),
        })),

      approveTimesheet: (id, regularHours, overtimeHours, comment) =>
        set((state) => {
          const totalBillable = regularHours + overtimeHours;
          const currentTs = state.timesheets.find((t) => t.id === id);
          const rejectedHours = currentTs ? Math.max(0, currentTs.totalActualHours - totalBillable) : 0;

          return {
            timesheets: state.timesheets.map((t) =>
              t.id === id
                ? {
                    ...t,
                    status: 'APPROVED' as TimesheetStatus,
                    approvedRegularHours: regularHours,
                    approvedOvertimeHours: overtimeHours,
                    approvedBillableHours: totalBillable,
                    rejectedHours,
                    managerComment: comment || 'Approved by project manager',
                    reviewedBy: state.currentUser.name,
                    reviewedAt: new Date().toISOString(),
                  }
                : t
            ),
          };
        }),

      rejectTimesheet: (id, reason) =>
        set((state) => ({
          timesheets: state.timesheets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'REJECTED' as TimesheetStatus,
                  rejectionReason: reason,
                  reviewedBy: state.currentUser.name,
                  reviewedAt: new Date().toISOString(),
                }
              : t
          ),
        })),

      generateInvoice: (vendorId, projectId, timesheetIds, dueDate) => {
        const state = get();
        const vendor = state.vendors.find((v) => v.id === vendorId);
        const project = state.projects.find((p) => p.id === projectId);

        const approvedTimesheets = state.timesheets.filter(
          (t) => timesheetIds.includes(t.id) && t.status === 'APPROVED'
        );

        const lineItems = approvedTimesheets.map((ts) => {
          const regH = ts.approvedRegularHours ?? ts.totalScheduledHours;
          const otH = ts.approvedOvertimeHours ?? 0;
          const regAmt = regH * ts.regularRate;
          const otAmt = otH * ts.overtimeRate;
          return {
            id: `li-${Date.now()}-${ts.id}`,
            timesheetId: ts.id,
            timesheetNumber: ts.timesheetNumber,
            employeeName: ts.employeeName,
            weekPeriod: `${ts.weekStartDate} to ${ts.weekEndDate}`,
            regularHours: regH,
            regularRate: ts.regularRate,
            regularAmount: regAmt,
            overtimeHours: otH,
            overtimeRate: ts.overtimeRate,
            overtimeAmount: otAmt,
            totalBillableHours: regH + otH,
            totalAmount: regAmt + otAmt,
          };
        });

        const subtotal = lineItems.reduce((acc, li) => acc + li.totalAmount, 0);
        const taxRate = 18; // 18% GST
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;

        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          vendorId,
          vendorName: vendor?.name || 'Vendor',
          projectId,
          projectName: project?.name || 'Project',
          weekOrPeriod: `Period ending ${new Date().toISOString().split('T')[0]}`,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate,
          lineItems,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          status: 'DRAFT',
          systemValidationPassed: true,
          validationIssues: [],
        };

        // Mark timesheets as invoiced
        const updatedTimesheets = state.timesheets.map((ts) =>
          timesheetIds.includes(ts.id) ? { ...ts, invoiced: true, invoiceId: newInvoice.id } : ts
        );

        set({
          invoices: [newInvoice, ...state.invoices],
          timesheets: updatedTimesheets,
        });

        return newInvoice;
      },

      submitInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: 'SUBMITTED' as InvoiceStatus } : inv
          ),
        })),

      managerApproveInvoice: (id, comments) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  status: 'UNDER_REVIEW' as InvoiceStatus,
                  managerApprovedBy: state.currentUser.name,
                  managerApprovedAt: new Date().toISOString(),
                  managerComments: comments || 'Manager verified and approved for finance clearance',
                }
              : inv
          ),
        })),

      financeApproveInvoice: (id, comments) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  status: 'APPROVED' as InvoiceStatus,
                  financeApprovedBy: state.currentUser.name,
                  financeApprovedAt: new Date().toISOString(),
                  financeComments: comments || 'Finance validated tax calculations and bank routing',
                }
              : inv
          ),
        })),

      rejectInvoice: (id, reason) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  status: 'REJECTED' as InvoiceStatus,
                  rejectionReason: reason,
                }
              : inv
          ),
        })),

      markInvoicePaid: (invoiceId, paymentMethod, referenceNumber, notes) =>
        set((state) => {
          const targetInv = state.invoices.find((i) => i.id === invoiceId);
          if (!targetInv) return state;

          const newPayment: PaymentRecord = {
            id: `pay-${Date.now()}`,
            invoiceId,
            invoiceNumber: targetInv.invoiceNumber,
            vendorId: targetInv.vendorId,
            vendorName: targetInv.vendorName,
            amount: targetInv.totalAmount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod,
            referenceNumber,
            status: 'SUCCESS',
            notes: notes || `Settled invoice ${targetInv.invoiceNumber}`,
          };

          // Update invoice status to PAID
          const updatedInvoices = state.invoices.map((inv) =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  status: 'PAID' as InvoiceStatus,
                  paymentMethod,
                  paymentReference: referenceNumber,
                  paidAt: new Date().toISOString(),
                }
              : inv
          );

          // Update vendor totals
          const updatedVendors = state.vendors.map((v) =>
            v.id === targetInv.vendorId
              ? { ...v, totalPaid: (v.totalPaid || 0) + targetInv.totalAmount }
              : v
          );

          return {
            invoices: updatedInvoices,
            payments: [newPayment, ...state.payments],
            vendors: updatedVendors,
          };
        }),

      resetMockData: () =>
        set({
          vendors: initialVendors,
          employees: initialEmployees,
          projects: initialProjects,
          assignments: initialAssignments,
          schedules: initialSchedules,
          timesheets: initialTimesheets,
          invoices: initialInvoices,
          payments: initialPayments,
        }),
    }),
    {
      name: 'vendor-sync-store-v2',
    }
  )
);
