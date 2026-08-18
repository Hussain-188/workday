package com.hackathon.workday.invoice;

/**
 * DRAFT -&gt; PENDING_APPROVAL -&gt; APPROVED | REJECTED. Every transition is a
 * single forward step; there is no un-approving or un-rejecting in MVP 1.
 */
public enum InvoiceStatus {
	/** Being assembled by the manager; not yet visible to the project manager. */
	DRAFT,
	/** Submitted by the manager; awaiting the project manager's decision. */
	PENDING_APPROVAL,
	APPROVED,
	REJECTED
}
