/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeZMBPhone } from './phone.util';
import { TimeService } from '../common/time/time.service';
import { getLogoAsset, getSvgToPdfModule } from './logo.util';
import e from 'express';
const prisma = new PrismaClient();
const time = new TimeService();

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
 * Generate four PDF receipts for a parcel: original, copy-of-original, sticker, accounts
 * Files are written under ./receipts/parcel-<id>-<type>.pdf
 */
export async function generateReceiptsForParcel(
  parcelId: string,
  cashierId?: string
): Promise<void> {
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

  // Fetch the cashier information if cashierId is provided
  let cashier: { firstName: string; lastName: string } | null = null;
  if (cashierId) {

    const user = await prisma.user.findUnique({
      where: { id: cashierId },
      select: { firstName: true, lastName: true },
    });
    cashier = user;

  }
  const types = [
    { key: 'original', title: 'Original Copy' },
    { key: 'copy-of-original', title: 'Copy of Original' },
    { key: 'sticker', title: 'Parcel Label' },
    { key: 'accounts', title: 'Accounts Copy' },
  ];

  const createdAt = time.toDate(parcel.createdAt as unknown as string);
  const formattedDate = time.format(createdAt, 'dd LLL, yyyy');

  const formatAmt = (n?: number) => (n || 0).toFixed(2);

  // Unit helpers for page sizing
  const mmToPt = (mm: number) => (mm / 25.4) * 72; // 72 pt = 1 inch
  const inToPt = (inch: number) => inch * 72;

  type PageOpts = { size: [number, number] | string; margin: number };
  const getPageOptions = (typeKey: string): PageOpts => {
    // Defaults (previous behavior)
    let opts: PageOpts = { size: 'A5', margin: 28 };

    // Requirements:
    // - Original copy receipt, Copy of Original receipt & Accounts copy receipt: 72mm width (thermal)
    // - Shipping label (sticker/parcel label): 4" x 6" (full) or 4" x 3.5" (short)
    if (typeKey === 'original' || typeKey === 'copy-of-original' || typeKey === 'accounts') {
      const width = mmToPt(72); // ~204 pt
      const height = inToPt(8.5); // reasonable roll height; add pages if needed
      opts = { size: [width, height], margin: 10 };
    } else if (typeKey === 'sticker') {
      // 4" wide, height depends on version
      const width = inToPt(4);
      // Short version uses 3.5" height to eliminate white space below barcode
      // Added 30pt to both heights for additional space
      const height = useStickerShortVersion ? inToPt(3.3) + 30 : inToPt(6) + 30;
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

  function formatCargoType(cargoType: string): string {
    if (cargoType === 'ELECTRONIC_SENSITIVE') {
      return 'ELECTRONICS & SENSITIVE DOCUMENTS';
    }
    return cargoType.toUpperCase();
  }

  function drawParcelSummary(doc: any) {
    doc.moveDown(0.7);
    doc.font('Helvetica-Bold').text('Parcel Details');
    doc.font('Helvetica');
    doc.text(`Description: ${parcel.description}`);
    doc.text(`Declared Value: ZMW ${formatAmt(parcel.value as unknown as number)}`);
    // Add cargo type in bold uppercase
    if ((parcel as any).cargoType) {
      const cargoLabel = formatCargoType((parcel as any).cargoType);
      doc.font('Helvetica-Bold').text(`Category: ${cargoLabel}`);
      doc.font('Helvetica');
    }
    doc.moveDown(0.3);
  }

  const logoAsset = getLogoAsset();
  const svgToPdf = logoAsset?.type === 'svg' ? getSvgToPdfModule() : null;

  const LOGO_WIDTH = 96;

  function drawReceiptLogo(doc: any, typeKey: string) {
    if (!logoAsset) {
      return;
    }
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const targetWidth = Math.min(LOGO_WIDTH, usableWidth);
    const x = doc.page.margins.left + (usableWidth - targetWidth) / 2;
    const y = doc.y;

    try {
      if (logoAsset.type === 'svg') {
        if (!svgToPdf) {
          return;
        }
        svgToPdf(doc, logoAsset.svg, x, y, {
          width: targetWidth,
          assumePt: true,
          preserveAspectRatio: 'xMidYMid meet',
        });
        doc.y = y + targetWidth + 8;
      } else {
        const img = doc.openImage(logoAsset.path);
        const scale = img && img.width ? targetWidth / img.width : 1;
        const height = img && img.height ? img.height * scale : targetWidth * 0.6;
        doc.image(logoAsset.path, x, y, { width: targetWidth });
        doc.y = y + height + 8;
      }
      doc.x = doc.page.margins.left;
    } catch (error) {
      console.warn('Failed to render receipt logo:', error);
      doc.y = y;
    }
  }

  // Determine if we should use the short sticker label version
  const useStickerShortVersion = process.env.STICKER_LABEL_VERSION === 'short';

  for (const t of types) {
    const page = getPageOptions(t.key);
    const doc = new PDFDocument({ size: page.size as any, margin: page.margin });
    const outPath = path.join(receiptsDir, `parcel-${parcelId}-${t.key}.pdf`);
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // drawReceiptLogo(doc, t.key);

    doc.font('Helvetica-Bold').fontSize(14).text('Platinum Courier Services', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).text(`Date: ${formattedDate}`, { align: 'center' });
    doc.moveDown(0.5);

    // For sticker labels, check if short version is requested
    const isSticker = t.key === 'sticker';
    const isStickerShort = isSticker && useStickerShortVersion;

    // Don't show title for short sticker version
    if (!isStickerShort) {
      doc.font('Helvetica-Bold').fontSize(12).text(t.title, { align: 'center' });
    }
    doc.font('Helvetica');
    doc.moveDown();

    const showFullDetails = !isSticker || !useStickerShortVersion;

    if (showFullDetails) {
      doc.fontSize(10).text(`Parcel #: ${parcel.parcelNumber}`);
      if (parcel.TrackingCode?.plainTextCode) {
        doc.text(`Tracking: ${parcel.TrackingCode.plainTextCode}`);
      }
      doc.text(`Size: ${parcel.size}`);
      if (parcel.payment) {
        doc.text(`Payment: ${parcel.payment.method} · ZMW ${parcel.payment.amount}`);
        if ((parcel.payment as any).reference) doc.text(`Ref: ${(parcel.payment as any).reference}`);
      }
      // Add cashier information
      if (cashier) {
        const cashierName = `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim();
        const displayName = cashierName || 'N/A';
        doc.font('Helvetica-Bold').text(`Cashier: ${displayName}`);
        doc.font('Helvetica');
      }
      doc.moveDown(0.6);
    }

    if (isStickerShort) {
      // Short version: condensed format
      doc.font('Helvetica-Bold').text(`Sender: ${parcel.customer.firstName}`);
      doc.font('Helvetica');
      const originName = (parcel as any).sendingOffice?.name || parcel.office.name;
      const originCode = (parcel as any).sendingOffice?.branchCode || parcel.office.branchCode;
      doc.text(`Office: ${originName} (${originCode})`);
      const senderContact = normalizeZMBPhone((parcel as any).customer?.phoneNumber) ?? '';
      doc.text(`Contact No: ${senderContact}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`Receiver: ${parcel.receiver.firstName}`);
      doc.font('Helvetica');
      doc.text(`Office: ${parcel.office.name} (${parcel.office.branchCode})`);
      const receiverContact = normalizeZMBPhone((parcel as any).receiver?.phoneNumber) ?? '';
      doc.text(`Contact No: ${receiverContact}`);
      // Add cargo type in bold uppercase for short sticker
      if ((parcel as any).cargoType) {
        doc.moveDown(0.3);
        const cargoLabel = formatCargoType((parcel as any).cargoType);
        doc.font('Helvetica-Bold').text(`Category: ${cargoLabel}`);
        doc.font('Helvetica');
      }
      // Add cashier to sticker short version
      if (cashier) {
        doc.moveDown(0.3);
        const cashierName = `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim();
        const displayName = cashierName || 'N/A';
        doc.font('Helvetica-Bold').text(`Cashier: ${displayName}`);
        doc.font('Helvetica');
      }
    } else {
      // Full version
      doc.font('Helvetica-Bold').text('Sender Details');
      doc.font('Helvetica');
      doc.text(`Sender Name: ${parcel.customer.firstName}`);
      const originName = (parcel as any).sendingOffice?.name || parcel.office.name;
      const originCode = (parcel as any).sendingOffice?.branchCode || parcel.office.branchCode;
      doc.text(`Office: ${originName} (${originCode})`);
      doc.text(`Date: ${formattedDate}`);
      const senderContact = normalizeZMBPhone((parcel as any).customer?.phoneNumber) ?? '';
      doc.text(`Contact No: ${senderContact}`);
      // Add cashier to full sticker version (sender section)
      if (isSticker && cashier) {
        const cashierName = `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim();
        const displayName = cashierName || 'N/A';
        doc.font('Helvetica-Bold').text(`Cashier: ${displayName}`);
        doc.font('Helvetica');
      }
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text("Receiver's Details");
      doc.font('Helvetica');
      doc.text(`Receiver's Name: ${parcel.receiver.firstName}`);
      doc.text(`Office: ${parcel.office.name} (${parcel.office.branchCode})`);
      doc.text(`Date: ${formattedDate}`);
      const receiverContact = normalizeZMBPhone((parcel as any).receiver?.phoneNumber) ?? '';
      doc.text(`Contact No: ${receiverContact}`);
    }

    if (showFullDetails) {
      drawParcelSummary(doc);
    }
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
    } catch { }

    // Only show disclaimer if not short sticker version
    if (!isStickerShort) {
      doc.moveDown(0.8);
      doc.font('Helvetica').fontSize(8);
      drawCenteredText(
        doc,
        'DISCLAIMER: Platinum Courier Services Shall Only Be Liable For Loss Or Damage Based on The Value Declared',
        { font: 'Helvetica', fontSize: 8 },
      );
    }

    doc.end();
    await new Promise<void>((res) => (stream as any).on('finish', res));
  }
}

export default { generateReceiptsForParcel };
