package com.hackathon.workday.timesheet;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.common.BaseEntity;
import com.hackathon.workday.common.exception.InvalidTimesheetEntryException;
import com.hackathon.workday.common.exception.InvalidTimesheetStateException;
import com.hackathon.workday.worker.Worker;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.hibernate.annotations.BatchSize;

/**
 * One worker's week of hours against one assignment.
 *
 * <p>This is the aggregate root for its entries: all state transitions and all
 * arithmetic happen here, so no caller can leave a timesheet whose totalHours
 * disagrees with its entries.
 */
@Entity
@Table(name = "timesheets")
public class Timesheet extends BaseEntity {

	/** Weeks run Monday to Sunday; the unique key per week depends on it. */
	public static final DayOfWeek WEEK_START_DAY = DayOfWeek.MONDAY;

	private static final BigDecimal MAX_DAILY_HOURS = new BigDecimal("24");
	private static final int HOURS_SCALE = 2;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "assignment_id", nullable = false)
	private Assignment assignment;

	/**
	 * Since an Assignment is now team-owned (MVP 2), the timesheet is the only
	 * place that records which team member logged this particular week.
	 */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "worker_id", nullable = false)
	private Worker worker;

	@Column(name = "week_start_date", nullable = false)
	private LocalDate weekStartDate;

	@Column(name = "week_end_date", nullable = false)
	private LocalDate weekEndDate;

	/** Always derived from the entries; a client-supplied total is ignored. */
	@Column(name = "total_hours", nullable = false, precision = 6, scale = 2)
	private BigDecimal totalHours = BigDecimal.ZERO.setScale(HOURS_SCALE);

	/**
	 * MVP 3 Soft Cap Rule: how many of {@code totalHours} are actually billable.
	 * {@code null} means "all of them" — the normal, never-flagged case. Only
	 * ever set by {@link #resolveReview}, once, when a manager decides a
	 * NEEDS_REVIEW week: {@code totalHours} if they approve the overage in
	 * full, or the assignment's {@code allocated_hours} if they cap it.
	 */
	@Column(name = "billable_hours", precision = 6, scale = 2)
	private BigDecimal billableHours;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TimesheetStatus status = TimesheetStatus.DRAFT;

	/**
	 * Batched so that listing a page of timesheets costs one extra query rather
	 * than one per row.
	 */
	@OneToMany(mappedBy = "timesheet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@BatchSize(size = 50)
	private List<TimesheetEntry> entries = new ArrayList<>();

	@Version
	private Long version;

	protected Timesheet() {
		// for JPA
	}

	public Timesheet(Assignment assignment, Worker worker, LocalDate weekStartDate) {
		if (weekStartDate.getDayOfWeek() != WEEK_START_DAY) {
			throw new InvalidTimesheetEntryException(
					"weekStartDate must be a Monday; received " + weekStartDate.getDayOfWeek());
		}
		this.assignment = assignment;
		this.worker = worker;
		this.weekStartDate = weekStartDate;
		this.weekEndDate = weekStartDate.plusDays(6);
		this.status = TimesheetStatus.DRAFT;
		this.totalHours = BigDecimal.ZERO.setScale(HOURS_SCALE);
	}

	/**
	 * Replaces the whole week's entries and recomputes the total. Validation
	 * lives here because only the timesheet knows its own week bounds.
	 *
	 * <p>Reconciled day by day rather than cleared and re-added. Clearing would
	 * make Hibernate insert the new rows before deleting the old ones in the
	 * same flush, colliding with the UNIQUE(timesheet_id, work_date) key
	 * whenever an edit keeps a day it already had. Updating in place also keeps
	 * entry ids stable across edits.
	 */
	public void replaceEntries(List<TimesheetEntry> newEntries) {
		requireDraft("edited");
		validate(newEntries);

		Map<LocalDate, TimesheetEntry> incoming = new LinkedHashMap<>();
		for (TimesheetEntry entry : newEntries) {
			incoming.put(entry.getWorkDate(), entry);
		}

		// Days no longer present are orphaned and deleted.
		entries.removeIf(existing -> !incoming.containsKey(existing.getWorkDate()));

		// Days that survive are updated where they stand.
		for (TimesheetEntry existing : entries) {
			TimesheetEntry replacement = incoming.remove(existing.getWorkDate());
			existing.update(replacement.getHours(), replacement.getNotes());
		}

		// Whatever is left is genuinely new, so no key can collide.
		for (TimesheetEntry addition : incoming.values()) {
			addition.setTimesheet(this);
			entries.add(addition);
		}

		recalculateTotal();
	}

	/**
	 * Marks the week complete. There is no approval step in MVP 1, so this is
	 * the terminal state.
	 */
	public void submit() {
		requireDraft("submitted");
		recalculateTotal();
		this.status = TimesheetStatus.SUBMITTED;
	}

	/**
	 * The Soft Cap Rule: called right after {@link #submit()} once the caller has
	 * confirmed the team's total logged hours on this assignment now exceed its
	 * {@code allocated_hours} budget. Detours the week to NEEDS_REVIEW instead of
	 * leaving it SUBMITTED-and-billable.
	 */
	public void flagForReview() {
		if (status != TimesheetStatus.SUBMITTED) {
			throw new InvalidTimesheetStateException(
					"Only a SUBMITTED timesheet can be flagged for review; this one is " + status);
		}
		this.status = TimesheetStatus.NEEDS_REVIEW;
	}

	/**
	 * The manager's decision on a flagged week. {@code approveOverage=true}
	 * bills every logged hour; {@code false} discards the overage and caps
	 * billable hours at {@code allocatedHours}. Either way the week returns to
	 * SUBMITTED, ready for the next Milestone Billing invoice.
	 */
	public void resolveReview(boolean approveOverage, BigDecimal allocatedHours) {
		if (status != TimesheetStatus.NEEDS_REVIEW) {
			throw new InvalidTimesheetStateException(
					"Timesheet is " + status + " and is not awaiting review");
		}
		this.billableHours = approveOverage ? totalHours : allocatedHours.min(totalHours);
		this.status = TimesheetStatus.SUBMITTED;
	}

	public boolean isDraft() {
		return status == TimesheetStatus.DRAFT;
	}

	private void requireDraft(String action) {
		if (status != TimesheetStatus.DRAFT) {
			throw new InvalidTimesheetStateException(
					"Timesheet is " + status + " and can no longer be " + action);
		}
	}

	private void validate(List<TimesheetEntry> candidates) {
		Set<LocalDate> seen = new HashSet<>();
		for (TimesheetEntry entry : candidates) {
			LocalDate date = entry.getWorkDate();
			if (date == null) {
				throw new InvalidTimesheetEntryException("workDate is required on every entry");
			}
			if (date.isBefore(weekStartDate) || date.isAfter(weekEndDate)) {
				throw new InvalidTimesheetEntryException(
						"workDate " + date + " falls outside the week "
								+ weekStartDate + " to " + weekEndDate);
			}
			if (!seen.add(date)) {
				throw new InvalidTimesheetEntryException("Duplicate entry for " + date);
			}

			BigDecimal hours = entry.getHours();
			if (hours == null) {
				throw new InvalidTimesheetEntryException("hours is required on every entry");
			}
			if (hours.signum() < 0 || hours.compareTo(MAX_DAILY_HOURS) > 0) {
				throw new InvalidTimesheetEntryException(
						"hours for " + date + " must be between 0 and 24; received " + hours);
			}
		}
	}

	/** The server is the only authority on the weekly total. */
	private void recalculateTotal() {
		this.totalHours = entries.stream()
				.map(TimesheetEntry::getHours)
				.reduce(BigDecimal.ZERO, BigDecimal::add)
				.setScale(HOURS_SCALE, java.math.RoundingMode.HALF_UP);
	}

	public Assignment getAssignment() {
		return assignment;
	}

	public Worker getWorker() {
		return worker;
	}

	public LocalDate getWeekStartDate() {
		return weekStartDate;
	}

	public LocalDate getWeekEndDate() {
		return weekEndDate;
	}

	public BigDecimal getTotalHours() {
		return totalHours;
	}

	/** The hours Milestone Billing should charge for: {@code totalHours} unless a review capped it. */
	public BigDecimal getBillableHours() {
		return billableHours != null ? billableHours : totalHours;
	}

	public TimesheetStatus getStatus() {
		return status;
	}

	public List<TimesheetEntry> getEntries() {
		return Collections.unmodifiableList(entries);
	}

	public Long getVersion() {
		return version;
	}
}
