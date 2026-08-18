package com.hackathon.workday.timesheet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hackathon.workday.common.exception.InvalidTimesheetEntryException;
import com.hackathon.workday.common.exception.InvalidTimesheetStateException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * The weekly rules live in the aggregate, so they can be proven without a
 * database, a web layer or a security context.
 */
class TimesheetAggregateTest {

	private static final LocalDate MONDAY = LocalDate.of(2026, 8, 17);

	private Timesheet newTimesheet() {
		return new Timesheet(null, MONDAY);
	}

	private TimesheetEntry entry(LocalDate date, String hours) {
		return new TimesheetEntry(date, new BigDecimal(hours), null);
	}

	@Test
	@DisplayName("the week runs Monday to Sunday and derives its own end date")
	void derivesWeekEndDate() {
		Timesheet timesheet = newTimesheet();

		assertThat(timesheet.getWeekStartDate()).isEqualTo(MONDAY);
		assertThat(timesheet.getWeekEndDate()).isEqualTo(LocalDate.of(2026, 8, 23));
		assertThat(timesheet.getStatus()).isEqualTo(TimesheetStatus.DRAFT);
	}

	@Test
	@DisplayName("a week that does not start on Monday is rejected")
	void rejectsNonMondayWeekStart() {
		assertThatThrownBy(() -> new Timesheet(null, LocalDate.of(2026, 8, 18)))
				.isInstanceOf(InvalidTimesheetEntryException.class)
				.hasMessageContaining("must be a Monday");
	}

	@Nested
	@DisplayName("total hours")
	class TotalHours {

		@Test
		@DisplayName("are calculated by the server, exactly, from the entries")
		void calculatesTotalFromEntries() {
			Timesheet timesheet = newTimesheet();

			timesheet.replaceEntries(List.of(
					entry(MONDAY, "8"),
					entry(MONDAY.plusDays(1), "8"),
					entry(MONDAY.plusDays(2), "7.5"),
					entry(MONDAY.plusDays(3), "8"),
					entry(MONDAY.plusDays(4), "8"),
					entry(MONDAY.plusDays(5), "0"),
					entry(MONDAY.plusDays(6), "0")));

			// BigDecimal, so this is exact rather than 39.499999999999996.
			assertThat(timesheet.getTotalHours()).isEqualByComparingTo("39.50");
		}

		@Test
		@DisplayName("start at zero for an empty week")
		void emptyWeekTotalsZero() {
			assertThat(newTimesheet().getTotalHours()).isEqualByComparingTo("0.00");
		}

		@Test
		@DisplayName("shrink when entries are removed by a replacement")
		void replacementRecalculates() {
			Timesheet timesheet = newTimesheet();
			timesheet.replaceEntries(List.of(entry(MONDAY, "8"), entry(MONDAY.plusDays(1), "8")));
			assertThat(timesheet.getTotalHours()).isEqualByComparingTo("16.00");

			timesheet.replaceEntries(List.of(entry(MONDAY, "4")));
			assertThat(timesheet.getTotalHours()).isEqualByComparingTo("4.00");
			assertThat(timesheet.getEntries()).hasSize(1);
		}
	}

	@Nested
	@DisplayName("entry validation")
	class EntryValidation {

		@Test
		@DisplayName("rejects a work date outside the timesheet's own week")
		void rejectsDateOutsideWeek() {
			Timesheet timesheet = newTimesheet();

			assertThatThrownBy(() -> timesheet.replaceEntries(List.of(entry(MONDAY.minusDays(1), "8"))))
					.isInstanceOf(InvalidTimesheetEntryException.class)
					.hasMessageContaining("falls outside the week");

			assertThatThrownBy(() -> timesheet.replaceEntries(List.of(entry(MONDAY.plusDays(7), "8"))))
					.isInstanceOf(InvalidTimesheetEntryException.class)
					.hasMessageContaining("falls outside the week");
		}

		@Test
		@DisplayName("rejects two entries for the same day")
		void rejectsDuplicateDate() {
			Timesheet timesheet = newTimesheet();

			assertThatThrownBy(() -> timesheet.replaceEntries(List.of(
					entry(MONDAY, "8"), entry(MONDAY, "4"))))
					.isInstanceOf(InvalidTimesheetEntryException.class)
					.hasMessageContaining("Duplicate entry");
		}

		@Test
		@DisplayName("rejects hours outside 0 to 24")
		void rejectsOutOfRangeHours() {
			Timesheet timesheet = newTimesheet();

			assertThatThrownBy(() -> timesheet.replaceEntries(List.of(entry(MONDAY, "24.5"))))
					.isInstanceOf(InvalidTimesheetEntryException.class)
					.hasMessageContaining("between 0 and 24");

			assertThatThrownBy(() -> timesheet.replaceEntries(List.of(entry(MONDAY, "-1"))))
					.isInstanceOf(InvalidTimesheetEntryException.class)
					.hasMessageContaining("between 0 and 24");
		}

		@Test
		@DisplayName("accepts the boundary values 0 and 24 and half hours")
		void acceptsBoundaryValues() {
			Timesheet timesheet = newTimesheet();

			timesheet.replaceEntries(List.of(
					entry(MONDAY, "0"),
					entry(MONDAY.plusDays(1), "24"),
					entry(MONDAY.plusDays(2), "0.5")));

			assertThat(timesheet.getTotalHours()).isEqualByComparingTo("24.50");
		}
	}

	@Nested
	@DisplayName("state transitions")
	class StateTransitions {

		@Test
		@DisplayName("a draft can be edited repeatedly")
		void draftIsEditable() {
			Timesheet timesheet = newTimesheet();

			timesheet.replaceEntries(List.of(entry(MONDAY, "8")));
			timesheet.replaceEntries(List.of(entry(MONDAY, "6")));

			assertThat(timesheet.isDraft()).isTrue();
			assertThat(timesheet.getTotalHours()).isEqualByComparingTo("6.00");
		}

		@Test
		@DisplayName("submitting moves the week to SUBMITTED")
		void submitChangesStatus() {
			Timesheet timesheet = newTimesheet();
			timesheet.replaceEntries(List.of(entry(MONDAY, "8")));

			timesheet.submit();

			assertThat(timesheet.getStatus()).isEqualTo(TimesheetStatus.SUBMITTED);
			assertThat(timesheet.isDraft()).isFalse();
		}

		@Test
		@DisplayName("a submitted timesheet can no longer be edited")
		void submittedIsImmutable() {
			Timesheet timesheet = newTimesheet();
			timesheet.replaceEntries(List.of(entry(MONDAY, "8")));
			timesheet.submit();

			assertThatThrownBy(() -> timesheet.replaceEntries(List.of(entry(MONDAY, "1"))))
					.isInstanceOf(InvalidTimesheetStateException.class)
					.hasMessageContaining("can no longer be edited");
		}

		@Test
		@DisplayName("a submitted timesheet cannot be submitted twice")
		void cannotResubmit() {
			Timesheet timesheet = newTimesheet();
			timesheet.submit();

			assertThatThrownBy(timesheet::submit)
					.isInstanceOf(InvalidTimesheetStateException.class)
					.hasMessageContaining("can no longer be submitted");
		}
	}

	@Test
	@DisplayName("the entry collection cannot be mutated from outside the aggregate")
	void entriesAreUnmodifiable() {
		Timesheet timesheet = newTimesheet();

		assertThatThrownBy(() -> timesheet.getEntries().add(entry(MONDAY, "8")))
				.isInstanceOf(UnsupportedOperationException.class);
	}
}
