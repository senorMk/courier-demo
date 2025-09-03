const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPdfKit() {
  try {
    return require("pdfkit");
  } catch (e) {
    console.warn("pdfkit not installed. Skipping PDF generation.");
    return null;
  }
}

/**
 * Generate three PDF receipts for a parcel: sender, sticker, accounts
 * Files are written under ./receipts/parcel-<id>-<type>.pdf
 * @param {string} parcelId
 */
async function generateReceiptsForParcel(parcelId) {
  const PDFDocument = loadPdfKit();
  if (!PDFDocument) return; // no-op if pdfkit missing

  const receiptsDir = path.resolve(process.cwd(), "receipts");
  ensureDir(receiptsDir);

  // Load parcel and related details for richer receipts
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: {
      customer: true,
      receiver: true,
      office: true,
      TrackingCode: true,
      payment: true,
    },
  });
  if (!parcel) return;

  const types = [
    { key: "sender", title: "Sender Copy" },
    { key: "sticker", title: "Parcel Label" },
    { key: "accounts", title: "Accounts Copy" },
  ];

  const createdAt = new Date(parcel.createdAt);
  const formattedDate = createdAt.toLocaleDateString("en-ZM", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const formatAmt = (n) => (n || 0).toFixed(2);

  async function drawCenteredBarcode(doc, barcodePath, width) {
    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const w = Math.min(width, contentWidth);
    const x = doc.page.margins.left + (contentWidth - w) / 2;
    // y is current doc.y
    doc.image(barcodePath, x, doc.y, { width: w });
  }

  function drawCenteredText(doc, text, options = {}) {
    // Apply font options if provided
    if (options.font) doc.font(options.font);
    if (options.fontSize) doc.fontSize(options.fontSize);

    // Use full page width to avoid any margin/x carryover effects, then restore x
    const prevX = doc.x;
    const prevY = doc.y;
    const fullWidth = doc.page.width;
    doc.text(text, 0, prevY, {
      width: fullWidth,
      align: "center",
      continued: false,
    });
    // Restore cursor to content box start on the next line
    doc.x = doc.page.margins.left;
  }

  async function drawItemsTable(doc) {
    const items = await prisma.parcelItem.findMany({
      where: { parcelId: parcel.id },
    });
    if (!items || items.length === 0) return;
    doc.moveDown(0.7);
    doc.fontSize(11).text("Items", { align: "left" });
    doc.moveDown(0.3);

    const startX = doc.page.margins.left;
    const maxWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colQty = 36;
    const colDesc = 160;
    const colPPU = 60;
    const colVal = 52;
    const colAmt = 56;
    const headersY = doc.y;

    const drawHeaderCell = (text, x, width) => {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(text, x, headersY, { width, align: "left" });
    };
    drawHeaderCell("Qty", startX, colQty);
    drawHeaderCell("Description", startX + colQty, colDesc);
    drawHeaderCell("Price/Unit", startX + colQty + colDesc, colPPU);
    drawHeaderCell("Value", startX + colQty + colDesc + colPPU, colVal);
    drawHeaderCell(
      "Amount",
      startX + colQty + colDesc + colPPU + colVal,
      colAmt
    );

    doc.moveDown(0.4);
    doc.font("Helvetica");

    let y = doc.y;
    let total = 0;
    for (const it of items) {
      const qty = String(it.quantity);
      const desc = it.description || "";
      const ppu = formatAmt(it.pricePerUnit);
      const val = formatAmt(it.value);
      const amt = formatAmt(it.amount);
      total += it.amount || 0;

      // Calculate row height based on description wrapping
      const descHeight = doc.heightOfString(desc, {
        width: colDesc,
        align: "left",
      });
      const rowH = Math.max(14, descHeight);
      const bottomY = y + rowH;

      // Page break if needed
      const pageBottom = doc.page.height - doc.page.margins.bottom;
      if (bottomY > pageBottom - 40) {
        // keep room for totals/disclaimer
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc.fontSize(9);
      doc.text(qty, startX, y, { width: colQty });
      doc.text(desc, startX + colQty, y, { width: colDesc });
      doc.text(ppu, startX + colQty + colDesc, y, { width: colPPU });
      doc.text(val, startX + colQty + colDesc + colPPU, y, { width: colVal });
      doc.text(amt, startX + colQty + colDesc + colPPU + colVal, y, {
        width: colAmt,
      });

      y = bottomY + 4;
      doc.y = y;
    }

    // Totals
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .text(`Total: ZMW ${formatAmt(total)}`, { align: "right" });
    doc.font("Helvetica");
  }

  for (const t of types) {
    const doc = new PDFDocument({ size: "A5", margin: 28 });
    const outPath = path.join(receiptsDir, `parcel-${parcelId}-${t.key}.pdf`);
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // Unified header for all copies
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Platinum Courier Services", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12).text(t.title, { align: "center" });
    doc.font("Helvetica");
    doc.moveDown();
    // Header meta
    doc.fontSize(10).text(`Parcel #: ${parcel.parcelNumber}`);
    if (parcel.TrackingCode?.plainTextCode) {
      doc.text(`Tracking: ${parcel.TrackingCode.plainTextCode}`);
    }
    doc.text(`Size: ${parcel.size}`);
    if (parcel.payment) {
      doc.text(
        `Payment: ${parcel.payment.method} · ZMW ${parcel.payment.amount}`
      );
      if (parcel.payment.reference)
        doc.text(`Ref: ${parcel.payment.reference}`);
    }
    doc.moveDown(0.6);

    // Unified details: always include both sender and receiver blocks
    doc.font("Helvetica-Bold").text("Sender Details");
    doc.font("Helvetica");
    doc.text(
      `Sender Name: ${parcel.customer.firstName} ${parcel.customer.lastName}`
    );
    doc.text(`Office: ${parcel.office.name} (${parcel.office.branchCode})`);
    doc.text(`Date: ${formattedDate}`);
    doc.text(`Contact No: +260${parcel.customer.phoneNumber}`);
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Receiver's Details");
    doc.font("Helvetica");
    doc.text(
      `Receiver's Name: ${parcel.receiver.firstName} ${parcel.receiver.lastName}`
    );
    doc.text(`Town: ${parcel.office.name}`);
    doc.text(`Date: ${formattedDate}`);
    doc.text(`Contact No: +260${parcel.receiver.phoneNumber}`);

    // Items table for all copies (unified template)
    await drawItemsTable(doc);
    try {
      const barcodePath = path.resolve(
        process.cwd(),
        `barcodes/parcel-${parcelId}.png`
      );
      if (!fs.existsSync(barcodePath)) {
        try {
          const { generateBarcodeForId } = require("./barcode-generator");
          // Generate and write the barcode PNG if missing
          await generateBarcodeForId(parcelId, "parcel", barcodePath);
        } catch {}
      }

      if (fs.existsSync(barcodePath)) {
        doc.moveDown(0.5);
        await drawCenteredBarcode(doc, barcodePath, 240);
      }
    } catch {}
    // Disclaimer (manually centered using measured text width)
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(8);

    drawCenteredText(
      doc,
      "DISCLAIMER: Platinum Courier Services Shall Only Be Liable For Loss Or Damage Based on The Value Declared",
      { font: "Helvetica", fontSize: 8 }
    );

    doc.end();
    await new Promise((res) => stream.on("finish", res));
  }
}

module.exports = { generateReceiptsForParcel };
