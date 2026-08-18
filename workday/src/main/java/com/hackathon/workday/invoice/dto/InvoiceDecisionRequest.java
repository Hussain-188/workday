package com.hackathon.workday.invoice.dto;

import jakarta.validation.constraints.Size;

/** Body for both approve and reject; notes are optional on approve, encouraged on reject. */
public record InvoiceDecisionRequest(
		@Size(max = 1000, message = "notes must not exceed 1000 characters")
		String notes) {
}
