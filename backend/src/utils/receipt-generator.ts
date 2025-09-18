/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeZMBPhone } from './phone.util';
const prisma = new PrismaClient();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPdfKit(): any | null {
  try {
    // pdfkit has no types by default in this project
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('pdfkit');
  } catch (e) {
    console.warn('pdfkit not installed. Skipping PDF generation.');
    return null;
  }
}

/**
 * Generate three PDF receipts for a parcel: sender, sticker, accounts
 * Files are written under ./receipts/parcel-<id>-<type>.pdf
 */
export async function generateReceiptsForParcel(parcelId: string): Promise<void> {
  const PDFDocument = loadPdfKit();
  if (!PDFDocument) return; // no-op if pdfkit missing

  const receiptsDir = path.resolve(process.cwd(), 'receipts');
  ensureDir(receiptsDir);

  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: {
      customer: true,
      receiver: true,
      office: true,
      sendingOffice: true,
      TrackingCode: true,
      payment: true,
    },
  });
  if (!parcel) return;

  const types = [
    { key: 'sender', title: 'Sender Copy' },
    { key: 'sticker', title: 'Parcel Label' },
    { key: 'accounts', title: 'Accounts Copy' },
  ];

  const createdAt = new Date(parcel.createdAt as unknown as string);
  const formattedDate = createdAt.toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  const formatAmt = (n?: number) => (n || 0).toFixed(2);

  // Unit helpers for page sizing
  const mmToPt = (mm: number) => (mm / 25.4) * 72; // 72 pt = 1 inch
  const inToPt = (inch: number) => inch * 72;

  type PageOpts = { size: [number, number] | string; margin: number };
  const getPageOptions = (typeKey: string): PageOpts => {
    // Defaults (previous behavior)
    let opts: PageOpts = { size: 'A5', margin: 28 };

    // Requirements:
    // - Sender copy receipt & Accounts copy receipt: 72mm width (thermal)
    // - Shipping label (sticker/parcel label): 4" x 6"
    if (typeKey === 'sender' || typeKey === 'accounts') {
      const width = mmToPt(72); // ~204 pt
      const height = inToPt(8.5); // reasonable roll height; add pages if needed
      opts = { size: [width, height], margin: 10 };
    } else if (typeKey === 'sticker') {
      // 4x6 inch label in portrait (4" wide x 6" tall)
      const width = inToPt(4);
      const height = inToPt(6);
      opts = { size: [width, height], margin: 14 };
    }
    return opts;
  };

  async function drawCenteredBarcode(doc: any, barcodePath: string, width: number) {
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const w = Math.min(width, contentWidth);
    const x = doc.page.margins.left + (contentWidth - w) / 2;
    doc.image(barcodePath, x, doc.y, { width: w });
  }

  function drawCenteredText(doc: any, text: string, options: { font?: string; fontSize?: number } = {}) {
    if (options.font) doc.font(options.font);
    if (options.fontSize) doc.fontSize(options.fontSize);
    const prevY = doc.y;
    const fullWidth = doc.page.width;
    doc.text(text, 0, prevY, { width: fullWidth, align: 'center', continued: false });
    doc.x = doc.page.margins.left;
  }

  async function drawItemsTable(doc: any) {
    const items = await prisma.parcelItem.findMany({ where: { parcelId: (parcel as any).id } });
    if (!items || items.length === 0) return;
    doc.moveDown(0.7);
    doc.fontSize(11).text('Items', { align: 'left' });
    doc.moveDown(0.3);

    const startX = doc.page.margins.left;
    const maxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colQty = 36;
    const colDesc = 160;
    const colPPU = 60;
    const colVal = 52;
    const colAmt = 56;
    const headersY = doc.y;

    const drawHeaderCell = (text: string, x: number, width: number) => {
      doc.fontSize(9).font('Helvetica-Bold').text(text, x, headersY, { width, align: 'left' });
    };
    drawHeaderCell('Qty', startX, colQty);
    drawHeaderCell('Description', startX + colQty, colDesc);
    drawHeaderCell('Price/Unit', startX + colQty + colDesc, colPPU);
    drawHeaderCell('Value', startX + colQty + colDesc + colPPU, colVal);
    drawHeaderCell('Amount', startX + colQty + colDesc + colPPU + colVal, colAmt);

    doc.moveDown(0.4);
    doc.font('Helvetica');

    let y = doc.y;
    let total = 0;
    for (const it of items) {
      const qty = String(it.quantity);
      const desc = it.description || '';
      const ppu = formatAmt(it.pricePerUnit as unknown as number);
      const val = formatAmt(it.value as unknown as number);
      const amt = formatAmt(it.amount as unknown as number);
      total += (it.amount as unknown as number) || 0;

      const descHeight = doc.heightOfString(desc, { width: colDesc, align: 'left' });
      const rowH = Math.max(14, descHeight);
      const bottomY = y + rowH;

      const pageBottom = doc.page.height - doc.page.margins.bottom;
      if (bottomY > pageBottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc.fontSize(9);
      doc.text(qty, startX, y, { width: colQty });
      doc.text(desc, startX + colQty, y, { width: colDesc });
      doc.text(ppu, startX + colQty + colDesc, y, { width: colPPU });
      doc.text(val, startX + colQty + colDesc + colPPU, y, { width: colVal });
      doc.text(amt, startX + colQty + colDesc + colPPU + colVal, y, { width: colAmt });

      y = bottomY + 4;
      doc.y = y;
    }

    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text(`Total: ZMW ${formatAmt(total)}`, { align: 'right' });
    doc.font('Helvetica');
  }

  for (const t of types) {
    const page = getPageOptions(t.key);
    const doc = new PDFDocument({ size: page.size as any, margin: page.margin });
    const outPath = path.join(receiptsDir, `parcel-${parcelId}-${t.key}.pdf`);
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    doc.font('Helvetica-Bold').fontSize(14).text('Platinum Courier Services', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12).text(t.title, { align: 'center' });
    doc.font('Helvetica');
    doc.moveDown();
    doc.fontSize(10).text(`Parcel #: ${parcel.parcelNumber}`);
    if (parcel.TrackingCode?.plainTextCode) {
      doc.text(`Tracking: ${parcel.TrackingCode.plainTextCode}`);
    }
    doc.text(`Size: ${parcel.size}`);
    if (parcel.payment) {
      doc.text(`Payment: ${parcel.payment.method} · ZMW ${parcel.payment.amount}`);
      if ((parcel.payment as any).reference) doc.text(`Ref: ${(parcel.payment as any).reference}`);
    }
    doc.moveDown(0.6);

    doc.font('Helvetica-Bold').text('Sender Details');
    doc.font('Helvetica');
    doc.text(`Sender Name: ${parcel.customer.firstName} ${parcel.customer.lastName}`);
    const originName = (parcel as any).sendingOffice?.name || parcel.office.name;
    const originCode = (parcel as any).sendingOffice?.branchCode || parcel.office.branchCode;
    doc.text(`Office: ${originName} (${originCode})`);
    doc.text(`Date: ${formattedDate}`);
    const senderContact = normalizeZMBPhone((parcel as any).customer?.phoneNumber) ?? '';
    doc.text(`Contact No: ${senderContact}`);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text("Receiver's Details");
    doc.font('Helvetica');
    doc.text(`Receiver's Name: ${parcel.receiver.firstName} ${parcel.receiver.lastName}`);
    doc.text(`Office: ${parcel.office.name} (${parcel.office.branchCode})`);
    doc.text(`Date: ${formattedDate}`);
    const receiverContact = normalizeZMBPhone((parcel as any).receiver?.phoneNumber) ?? '';
    doc.text(`Contact No: ${receiverContact}`);

    await drawItemsTable(doc);
    try {
      const barcodePath = path.resolve(process.cwd(), `barcodes/parcel-${parcelId}.png`);
      if (!fs.existsSync(barcodePath)) {
        const { generateBarcodeForId } = await import('./barcode-generator');
        await generateBarcodeForId(parcelId, 'parcel', barcodePath);
      }
      if (fs.existsSync(barcodePath)) {
        doc.moveDown(0.5);
        await drawCenteredBarcode(doc, barcodePath, 240);
      }
    } catch {}

    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(8);
    drawCenteredText(
      doc,
      'DISCLAIMER: Platinum Courier Services Shall Only Be Liable For Loss Or Damage Based on The Value Declared',
      { font: 'Helvetica', fontSize: 8 },
    );

    doc.end();
    await new Promise<void>((res) => (stream as any).on('finish', res));
  }
}

export default { generateReceiptsForParcel };
