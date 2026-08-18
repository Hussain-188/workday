import { Role } from '../types';

/**
 * Calculate actual working hours from start, end, and break minutes
 * Formula: Actual Hours = End Time - Start Time - Break
 */
export function calculateActualHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  if (!startTime || !endTime || startTime === '00:00' || endTime === '00:00') {
    return 0;
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return 0;
  }

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  if (endTotalMinutes <= startTotalMinutes) {
    return 0;
  }

  const workMinutes = endTotalMinutes - startTotalMinutes - (breakMinutes || 0);
  if (workMinutes <= 0) return 0;

  return Math.round((workMinutes / 60) * 10) / 10;
}

/**
 * Calculate Overtime according to the selected policy:
 * - DAILY_AFTER_8: Hours above 8.0 in a single day
 * - WEEKLY_AFTER_40: Hours above 40 in the full week
 * - NO_OVERTIME: 0
 */
export function calculateDailyOvertime(actualHours: number): number {
  if (actualHours > 8) {
    return Math.round((actualHours - 8) * 10) / 10;
  }
  return 0;
}

/**
 * Validates a single daily entry and returns warning messages
 */
export interface EntryValidationResult {
  hasError: boolean;
  hasWarning: boolean;
  errorMessage?: string;
  warningMessage?: string;
  requiresReason?: boolean;
}

export function validateDailyEntry(
  scheduledHours: number,
  startTime: string,
  endTime: string,
  breakMinutes: number,
  workDescription: string
): EntryValidationResult {
  if (!startTime || !endTime || startTime === '00:00' || endTime === '00:00') {
    return {
      hasError: false,
      hasWarning: scheduledHours > 0,
      warningMessage: scheduledHours > 0 ? 'No hours logged for scheduled work day' : undefined,
    };
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  if (endTotalMinutes <= startTotalMinutes) {
    return {
      hasError: true,
      hasWarning: false,
      errorMessage: 'Start time cannot be after or equal to end time',
    };
  }

  const actualHours = calculateActualHours(startTime, endTime, breakMinutes);

  if (actualHours > 0 && (!workDescription || workDescription.trim().length < 5)) {
    return {
      hasError: false,
      hasWarning: true,
      warningMessage: 'Please provide a detailed work description (min 5 chars)',
    };
  }

  const variance = actualHours - scheduledHours;

  if (variance >= 2) {
    return {
      hasError: false,
      hasWarning: true,
      warningMessage: `⚠ Schedule mismatch: +${variance.toFixed(1)}h over scheduled ${scheduledHours}h`,
      requiresReason: true,
    };
  }

  if (variance <= -2 && scheduledHours > 0) {
    return {
      hasError: false,
      hasWarning: true,
      warningMessage: `⚠ Hours significantly below schedule: ${actualHours}h vs ${scheduledHours}h expected`,
      requiresReason: true,
    };
  }

  return { hasError: false, hasWarning: false };
}

/**
 * Currency formatter (₹ INR / $ USD)
 */
export function formatCurrency(amount: number, currency: string = '₹'): string {
  return `${currency} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
