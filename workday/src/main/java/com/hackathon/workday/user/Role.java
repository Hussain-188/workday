package com.hackathon.workday.user;

/**
 * Coarse-grained permission tier. A role alone never grants access to a
 * specific record; services additionally verify resource ownership.
 */
public enum Role {

	/** Organization-wide visibility and structural administration. */
	SYSTEM_ADMIN,

	/** Owns the worker lifecycle: onboarding, updates, offboarding. */
	HR_MANAGER,

	/** Owns the teams they manage, and work assigned within them. */
	MANAGER,

	/**
	 * Owns contract-level approval: reviews the invoices managers submit against
	 * a contract and approves or rejects them. Does not manage teams or workers.
	 */
	PROJECT_MANAGER,

	/** An employee, contractor or temporary worker recording their own hours. */
	WORKER;

	/** Spring Security expects the {@code ROLE_} prefix on authorities. */
	public String authority() {
		return "ROLE_" + name();
	}
}
