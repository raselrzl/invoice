import prisma from "@/app/utils/db";
import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import { formatCurrency } from "@/app/utils/formatCurrency";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ invoiceId: string }>;
  }
) {
  const { invoiceId } = await params;

  const data = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      invoiceName: true,
      invoiceNumber: true,
      currency: true,
      fromName: true,
      fromEmail: true,
      fromAddress: true,
      clientName: true,
      clientAddress: true,
      clientEmail: true,
      date: true,
      dueDate: true,
      invoiceItemDescription: true,
      invoiceItemQuantity: true,
      invoiceItemRate: true,
      total: true,
      note: true,
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const logoPath = path.join(process.cwd(), 'public', 'logotext.png');
  // Read the image file and convert to Base64
  const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set font
  pdf.setFont("helvetica");

  // Add the logo image to the PDF (top-left corner)
  const logoX = 140; // X position of the logo
  const logoY = 15;  // Y position of the logo
  const logoWidth = 50; // Width of the logo
  const logoHeight = 8; // Height of the logo
  pdf.addImage(logoBase64, "PNG", logoX, logoY, logoWidth, logoHeight);

  // Push everything else down to avoid overlap with logo
  let verticalOffset = logoY + logoHeight + 20;

  // Set header
  pdf.setFontSize(24);
  pdf.text(data.invoiceName, 20, 20);

  // From Section (Sender Details)
  pdf.setFontSize(12);
  pdf.text("From", 20, verticalOffset);
  pdf.setFontSize(10);
  pdf.text([data.fromName, data.fromEmail, data.fromAddress], 20, verticalOffset + 5);

  // Client Section (Receiver Details)
  verticalOffset += 30;
  pdf.setFontSize(12);
  pdf.text("Invoice to", 20, verticalOffset);
  pdf.setFontSize(10);
  pdf.text([data.clientName, data.clientEmail, data.clientAddress], 20, verticalOffset + 5);

  // Invoice details
  verticalOffset += 30;
  pdf.setFontSize(10);
  pdf.text(`Invoice Number: #${data.invoiceNumber}`, 120, verticalOffset);
  pdf.text(
    `Date: ${new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
    }).format(data.date)}`,
    120,
    verticalOffset + 5
  );
  pdf.text(`Due Date: Net ${data.dueDate}`, 120, verticalOffset + 10);

  // Item table header
  verticalOffset += 30;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Description", 20, verticalOffset);
  pdf.text("Quantity", 100, verticalOffset);
  pdf.text("Price", 130, verticalOffset);
  pdf.text("Total", 160, verticalOffset);

  // Draw header line
  pdf.line(20, verticalOffset + 2, 190, verticalOffset + 2);
  verticalOffset += 10;

  // Item Details
  pdf.setFont("helvetica", "normal");
  pdf.text(data.invoiceItemDescription, 20, verticalOffset);
  pdf.text(data.invoiceItemQuantity.toString(), 100, verticalOffset);
  pdf.text(
    formatCurrency({
      amount: data.invoiceItemRate,
      currency: data.currency as any,
    }),
    130,
    verticalOffset
  );
  pdf.text(
    formatCurrency({ amount: data.total, currency: data.currency as any }),
    160,
    verticalOffset
  );

  // Total Section
  verticalOffset += 10;
  pdf.line(20, verticalOffset, 190, verticalOffset);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total (${data.currency})`, 130, verticalOffset + 5);
  pdf.text(
    formatCurrency({ amount: data.total, currency: data.currency as any }),
    160,
    verticalOffset + 5
  );

  // Additional Note (if exists)
  if (data.note) {
    verticalOffset += 20;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Note:", 20, verticalOffset);
    pdf.text(data.note, 20, verticalOffset + 5);
  }

  // Calculate footer position based on total height of content
  const pageHeight = 297; // A4 page height in mm
  const footerHeight = 30; // Footer height in mm
  const remainingSpace = pageHeight - verticalOffset - footerHeight - 10; // Add some padding at the bottom

  // Add footer only if there's enough space, otherwise push content up
  const footerY = remainingSpace > 0 ? pageHeight - footerHeight : verticalOffset + 10;

  // Add background color for footer section
  pdf.setFillColor(233, 240, 240);  // Light gray background
  pdf.rect(0, footerY, 210, footerHeight, "F");

  // Column 1: Company Address
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Company Address: 1234 Random Street, City, Country", 20, footerY + 10);
  pdf.text("Phone: +1234567890", 20, footerY + 15);
  pdf.text("Email: contact@company.com", 20, footerY + 20);

  // Column 2: Bank Account Information
  pdf.text("Bank Account: GB29 NWBK 6016 1331 9268 19", 120, footerY + 10);
  pdf.text("Sort Code: 60-01-01", 120, footerY + 15);
  pdf.text("IBAN: GB29 NWBK 6016 1331 9268 19", 120, footerY + 20);

  // Generate the PDF as buffer
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  // Return the PDF as a download
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  });
}
