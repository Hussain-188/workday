package com.hackathon.workday.invoice;

import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.common.exception.InvalidInvoiceStateException;
import com.hackathon.workday.contract.Contract;
import com.hackathon.workday.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One manager's billing claim against a contract, routed to a project manager
 * for a single approve-or-reject decision.
 *
 * <p>This is the aggregate root for its own lifecycle: every status transition
 * happens here, so no caller can move an invoice through a state the entity
 * itself did not sanction.
 */
@Entity
@Table(name = "invoices")
public class Invoice extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "contract_id", nullable = false)
	private Contract contract;

	/** The manager who verified the timesheets and generated this invoice. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "manager_id", nullable = false)
	private User manager;

	/** The project manager this invoice is routed to for approval. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "project_manager_id", nullable = false)
	private User projectManager;

	@Column(name = "period_start", nullable = false)
	private LocalDate periodStart;

	@Column(name = "period_end", nullable = false)
	private LocalDate periodEnd;

	@Column(nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	/** The manager's notes at creation/submission time. */
	@Column(length = 1000)
	private String notes;

	/** The project manager's notes on their approve/reject decision. */
	@Column(name = "decision_notes", length = 1000)
	private String decisionNotes;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InvoiceStatus status = InvoiceStatus.DRAFT;

	protected Invoice() {
		// for JPA
	}

	public Invoice(Contract contract, User manager, User projectManager,
			LocalDate periodStart, LocalDate periodEnd, BigDecimal amount, String notes) {
		if (periodEnd.isBefore(periodStart)) {
			throw new InvalidInvoiceStateException("periodEnd must not precede periodStart");
		}
		if (amount == null || amount.signum() < 0) {
			throw new InvalidInvoiceStateException("amount must not be negative");
		}
		this.contract = contract;
		this.manager = manager;
		this.projectManager = projectManager;
		this.periodStart = periodStart;
		this.periodEnd = periodEnd;
		this.amount = amount;
		this.notes = notes;
		this.status = InvoiceStatus.DRAFT;
	}

	/** Routes the invoice to the assigned project manager for a decision. */
	public void submit() {
		requireStatus(InvoiceStatus.DRAFT, "submitted");
		this.status = InvoiceStatus.PENDING_APPROVAL;
	}

	public void approve(String decisionNotes) {
		requireStatus(InvoiceStatus.PENDING_APPROVAL, "approved");
		this.status = InvoiceStatus.APPROVED;
		this.decisionNotes = decisionNotes;
	}

	public void reject(String decisionNotes) {
		requireStatus(InvoiceStatus.PENDING_APPROVAL, "rejected");
		this.status = InvoiceStatus.REJECTED;
		this.decisionNotes = decisionNotes;
	}

	public boolean isOwnedByManager(Long userId) {
		return manager.getId().equals(userId);
	}

	public boolean isAssignedToProjectManager(Long userId) {
		return projectManager.getId().equals(userId);
	}

	private void requireStatus(InvoiceStatus expected, String action) {
		if (status != expected) {
			throw new InvalidInvoiceStateException(
					"Invoice is " + status + " and cannot be " + action);
		}
	}

	public Contract getContract() {
		return contract;
	}

	public User getManager() {
		return manager;
	}

	public User getProjectManager() {
		return projectManager;
	}

	public LocalDate getPeriodStart() {
		return periodStart;
	}

	public LocalDate getPeriodEnd() {
		return periodEnd;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public String getNotes() {
		return notes;
	}

	public String getDecisionNotes() {
		return decisionNotes;
	}

	public InvoiceStatus getStatus() {
		return status;
	}
}
