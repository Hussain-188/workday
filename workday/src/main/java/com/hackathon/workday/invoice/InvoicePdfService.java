package com.hackathon.workday.invoice;

import com.hackathon.workday.assignment.Assignment;
import com.hackathon.workday.assignment.AssignmentRepository;
import com.hackathon.workday.timesheet.Timesheet;
import com.hackathon.workday.timesheet.TimesheetRepository;
import com.hackathon.workday.timesheet.TimesheetStatus;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Renders an {@link Invoice} as a downloadable PDF for MVP 3's export
 * endpoint: contract, billing period, and the assignment/worker/hours/rate
 * breakdown behind the total.
 *
 * <p>The breakdown is a best-effort reconstruction, not a stored line-item
 * table — {@code Invoice} only ever persisted the aggregate {@code amount}
 * (see MVP2 §8's known limitation). It is rebuilt here by re-running the
 * exact rule {@link InvoiceService#generateInvoiceForContract} bills by:
 * every SUBMITTED timesheet on one of the contract's assignments whose week
 * falls inside the invoice's billing period. A manually-raised invoice (no
 * Milestone Billing timesheets behind it) simply renders with an empty
 * breakdown and a note to that effect.
 */
@Service
public class InvoicePdfService {

	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");
	private static final Color HEADER_FILL = new Color(0x24, 0x3B, 0x53);
	private static final Color ROW_FILL = new Color(0xF3, 0xF5, 0xF7);

	private final AssignmentRepository assignmentRepository;
	private final TimesheetRepository timesheetRepository;

	public InvoicePdfService(AssignmentRepository assignmentRepository, TimesheetRepository timesheetRepository) {
		this.assignmentRepository = assignmentRepository;
		this.timesheetRepository = timesheetRepository;
	}

	public byte[] render(Invoice invoice) {
		List<Assignment> assignments = assignmentRepository.findByContractId(invoice.getContract().getId());
		List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
		List<Timesheet> lineItems = assignmentIds.isEmpty()
				? List.of()
				: timesheetRepository.findBillableForInvoicePeriod(
						assignmentIds, TimesheetStatus.SUBMITTED, invoice.getPeriodStart(), invoice.getPeriodEnd());

		Document document = new Document(PageSize.A4, 42, 42, 54, 54);
		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			PdfWriter.getInstance(document, out);
			document.open();

			addHeader(document, invoice);
			addSummary(document, invoice);
			addLineItems(document, lineItems);
			addTotal(document, invoice);
			addFooter(document);

			document.close();
			return out.toByteArray();
		} catch (DocumentException e) {
			throw new IllegalStateException("Failed to render invoice " + invoice.getId() + " as PDF", e);
		}
	}

	private void addHeader(Document document, Invoice invoice) throws DocumentException {
		Font titleFont = new Font(Font.HELVETICA, 22, Font.BOLD, HEADER_FILL);
		Font statusFont = new Font(Font.HELVETICA, 11, Font.BOLD, statusColor(invoice.getStatus()));

		Paragraph title = new Paragraph("INVOICE #" + invoice.getId(), titleFont);
		title.setSpacingAfter(2);
		document.add(title);

		Paragraph status = new Paragraph(invoice.getStatus().name().replace('_', ' '), statusFont);
		status.setSpacingAfter(16);
		document.add(status);
	}

	private void addSummary(Document document, Invoice invoice) throws DocumentException {
		PdfPTable table = new PdfPTable(2);
		table.setWidthPercentage(100);
		table.setWidths(new float[] {1f, 1f});
		table.setSpacingAfter(18);

		addSummaryRow(table, "Contract", invoice.getContract().getProjectName());
		addSummaryRow(table, "Billing period",
				invoice.getPeriodStart().format(DATE_FORMAT) + " → " + invoice.getPeriodEnd().format(DATE_FORMAT));
		addSummaryRow(table, "Raised by (manager)", invoice.getManager().getName());
		addSummaryRow(table, "Routed to (project manager)", invoice.getProjectManager().getName());
		if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
			addSummaryRow(table, "Notes", invoice.getNotes());
		}
		if (invoice.getDecisionNotes() != null && !invoice.getDecisionNotes().isBlank()) {
			addSummaryRow(table, "Decision notes", invoice.getDecisionNotes());
		}

		document.add(table);
	}

	private void addSummaryRow(PdfPTable table, String label, String value) {
		Font labelFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY);
		Font valueFont = new Font(Font.HELVETICA, 10, Font.BOLD);

		PdfPCell labelCell = new PdfPCell(new com.lowagie.text.Phrase(label, labelFont));
		labelCell.setBorder(com.lowagie.text.Rectangle.BOTTOM);
		labelCell.setBorderColor(ROW_FILL);
		labelCell.setPaddingTop(4);
		labelCell.setPaddingBottom(4);
		table.addCell(labelCell);

		PdfPCell valueCell = new PdfPCell(new com.lowagie.text.Phrase(value, valueFont));
		valueCell.setBorder(com.lowagie.text.Rectangle.BOTTOM);
		valueCell.setBorderColor(ROW_FILL);
		valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
		valueCell.setPaddingTop(4);
		valueCell.setPaddingBottom(4);
		table.addCell(valueCell);
	}

	private void addLineItems(Document document, List<Timesheet> lineItems) throws DocumentException {
		Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD);
		Paragraph heading = new Paragraph("Billed hours", sectionFont);
		heading.setSpacingAfter(6);
		document.add(heading);

		if (lineItems.isEmpty()) {
			Font noteFont = new Font(Font.HELVETICA, 9, Font.ITALIC, Color.GRAY);
			Paragraph note = new Paragraph(
					"No itemized Milestone Billing timesheets were found for this period "
							+ "(this invoice may have been raised manually).",
					noteFont);
			note.setSpacingAfter(16);
			document.add(note);
			return;
		}

		PdfPTable table = new PdfPTable(6);
		table.setWidthPercentage(100);
		table.setWidths(new float[] {2.2f, 1.8f, 1.4f, 1.1f, 1f, 1.3f});
		table.setSpacingAfter(16);

		Font headFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
		for (String heading2 : new String[] {"Assignment", "Worker", "Week", "Hours billed", "Rate", "Line amount"}) {
			PdfPCell cell = new PdfPCell(new com.lowagie.text.Phrase(heading2, headFont));
			cell.setBackgroundColor(HEADER_FILL);
			cell.setPadding(6);
			table.addCell(cell);
		}

		Font bodyFont = new Font(Font.HELVETICA, 9, Font.NORMAL);
		BigDecimal moneyScale = new BigDecimal("0.01");
		boolean shaded = false;
		for (Timesheet timesheet : lineItems) {
			BigDecimal rate = timesheet.getWorker().getHourlyRate();
			BigDecimal lineAmount = timesheet.getBillableHours().multiply(rate)
					.setScale(moneyScale.scale(), java.math.RoundingMode.HALF_UP);

			Color fill = shaded ? ROW_FILL : Color.WHITE;
			addBodyCell(table, timesheet.getAssignment().getTitle(), bodyFont, Element.ALIGN_LEFT, fill);
			addBodyCell(table, timesheet.getWorker().getUser().getName(), bodyFont, Element.ALIGN_LEFT, fill);
			addBodyCell(table, timesheet.getWeekStartDate().format(DATE_FORMAT), bodyFont, Element.ALIGN_LEFT, fill);
			addBodyCell(table, timesheet.getBillableHours().toPlainString() + "h", bodyFont, Element.ALIGN_RIGHT, fill);
			addBodyCell(table, "$" + rate.toPlainString(), bodyFont, Element.ALIGN_RIGHT, fill);
			addBodyCell(table, "$" + lineAmount.toPlainString(), bodyFont, Element.ALIGN_RIGHT, fill);
			shaded = !shaded;
		}

		document.add(table);
	}

	private void addBodyCell(PdfPTable table, String text, Font font, int alignment, Color fill) {
		PdfPCell cell = new PdfPCell(new com.lowagie.text.Phrase(text, font));
		cell.setHorizontalAlignment(alignment);
		cell.setPadding(6);
		cell.setBackgroundColor(fill);
		table.addCell(cell);
	}

	private void addTotal(Document document, Invoice invoice) throws DocumentException {
		Font totalLabelFont = new Font(Font.HELVETICA, 12, Font.BOLD);
		Font totalValueFont = new Font(Font.HELVETICA, 18, Font.BOLD, HEADER_FILL);

		PdfPTable table = new PdfPTable(2);
		table.setWidthPercentage(60);
		table.setHorizontalAlignment(Element.ALIGN_RIGHT);
		table.setWidths(new float[] {1f, 1f});
		table.setSpacingBefore(6);

		PdfPCell labelCell = new PdfPCell(new com.lowagie.text.Phrase("Total amount", totalLabelFont));
		labelCell.setBorder(com.lowagie.text.Rectangle.TOP);
		labelCell.setPaddingTop(8);
		table.addCell(labelCell);

		PdfPCell valueCell = new PdfPCell(new com.lowagie.text.Phrase("$" + invoice.getAmount().toPlainString(), totalValueFont));
		valueCell.setBorder(com.lowagie.text.Rectangle.TOP);
		valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
		valueCell.setPaddingTop(8);
		table.addCell(valueCell);

		document.add(table);
	}

	private void addFooter(Document document) throws DocumentException {
		Font footerFont = new Font(Font.HELVETICA, 8, Font.ITALIC, Color.GRAY);
		Paragraph footer = new Paragraph(
				"Generated by Workday on " + java.time.LocalDate.now().format(DATE_FORMAT), footerFont);
		footer.setSpacingBefore(24);
		document.add(footer);
	}

	private Color statusColor(InvoiceStatus status) {
		return switch (status) {
			case APPROVED -> new Color(0x1E, 0x7B, 0x34);
			case REJECTED -> new Color(0xB3, 0x26, 0x1E);
			case PENDING_APPROVAL -> new Color(0x1D, 0x4E, 0x89);
			case DRAFT -> Color.GRAY;
		};
	}
}
