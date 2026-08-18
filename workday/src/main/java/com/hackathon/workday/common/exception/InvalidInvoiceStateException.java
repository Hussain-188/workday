package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** e.g. attempting to approve, reject or resubmit an invoice that is not PENDING_APPROVAL. */
public class InvalidInvoiceStateException extends ApiException {

	public InvalidInvoiceStateException(String message) {
		super(HttpStatus.CONFLICT, "INVALID_INVOICE_STATE", message);
	}
}
