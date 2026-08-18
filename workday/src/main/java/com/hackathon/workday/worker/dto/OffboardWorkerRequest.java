package com.hackathon.workday.worker.dto;

import java.time.LocalDate;

/**
 * @param effectiveDate last day of employment; defaults to today when omitted.
 *        Must not precede the worker's employmentStartDate.
 * @param reason optional free text recorded on the audit trail
 */
public record OffboardWorkerRequest(LocalDate effectiveDate, String reason) {
}
