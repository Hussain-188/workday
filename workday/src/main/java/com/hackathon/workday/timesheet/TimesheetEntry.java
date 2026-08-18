package com.hackathon.workday.timesheet;

import com.hackathon.workday.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One day's hours. Part of the {@link Timesheet} aggregate: entries are always
 * created, replaced and deleted through their timesheet, never on their own.
 *
 * <p>Hours are {@link BigDecimal}. Binary floating point would make 7.5 + 8 + 8
 * fail to equal 23.5 exactly, which is unacceptable for billable time.
 */
@Entity
@Table(name = "timesheet_entries")
public class TimesheetEntry extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "timesheet_id", nullable = false)
	private Timesheet timesheet;

	@Column(name = "work_date", nullable = false)
	private LocalDate workDate;

	@Column(nullable = false, precision = 4, scale = 2)
	private BigDecimal hours;

	@Column(length = 500)
	private String notes;

	protected TimesheetEntry() {
		// for JPA
	}

	public TimesheetEntry(LocalDate workDate, BigDecimal hours, String notes) {
		this.workDate = workDate;
		this.hours = hours;
		this.notes = notes;
	}

	/**
	 * Applies an edit in place. Only the aggregate calls this, after it has
	 * validated the values against the week's rules.
	 */
	void update(BigDecimal hours, String notes) {
		this.hours = hours;
		this.notes = notes;
	}

	public Timesheet getTimesheet() {
		return timesheet;
	}

	void setTimesheet(Timesheet timesheet) {
		this.timesheet = timesheet;
	}

	public LocalDate getWorkDate() {
		return workDate;
	}

	public BigDecimal getHours() {
		return hours;
	}

	public String getNotes() {
		return notes;
	}
}
