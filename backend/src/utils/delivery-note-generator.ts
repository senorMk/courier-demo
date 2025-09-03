/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPdfKit(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('pdfkit');
  } catch (e) {
    console.warn('pdfkit not installed. Skipping delivery note generation.');
    return null;
  }
}

export function getDeliveryNotePath(sessionId: string): string {
  const dir = path.resolve(process.cwd(), 'delivery-notes');
  ensureDir(dir);
  return path.join(dir, `session-${sessionId}.pdf`);
}

/**
 * Generate a delivery note PDF for a session.
 * If the output already exists and force=false, it returns the existing path.
 */
export async function generateDeliveryNote(
  sessionId: string,
  opts: { force?: boolean } = {},
): Promise<string | null> {
  const { force = false } = opts;
  const PDFDocument = loadPdfKit();
  if (!PDFDocument) return null;

  const prisma = new PrismaClient();
  const session = await prisma.scanningSession.findUnique({
    where: { id: sessionId },
    include: {
      office: true,
      route: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      scans: {
        include: {
          parcel: { include: { TrackingCode: true, office: true } },
          scannedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scannedAt: 'asc' },
      },
    },
  });
  if (!session) throw new Error('Session not found');

  const outPath = getDeliveryNotePath(sessionId);
  if (!force && fs.existsSync(outPath)) return outPath;

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  doc.font('Helvetica-Bold').fontSize(16).text('Delivery Note', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10).text(`Session: ${session.id}`);
  doc.text(`Route: ${session.route?.name || session.routeId} (${session.route?.code || ''})`);
  doc.text(`Office: ${session.office?.name} (${session.office?.branchCode})`);
  doc.text(`Mode: ${session.mode}`);
  doc.text(`Staff: ${((session.user?.firstName || '') + ' ' + (session.user?.lastName || '')).trim()}`);
  doc.text(`Started: ${new Date(session.startedAt as unknown as string).toLocaleString()}`);
  if ((session as any).closedAt)
    doc.text(`Closed: ${new Date((session as any).closedAt as unknown as string).toLocaleString()}`);

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(11).text('Scanned Parcels');
  doc.moveDown(0.3);
  const startX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colCode = Math.floor(contentWidth * 0.38);
  const colDest = Math.floor(contentWidth * 0.3);
  const colStaff = Math.floor(contentWidth * 0.18);
  const colTime = contentWidth - (colCode + colDest + colStaff);

  function fitTextToWidth(text: string, width: number, opts: { font?: string; size?: number } = {}) {
    const t = String(text ?? '');
    if (!t) return '';
    if (opts.font) doc.font(opts.font);
    if (opts.size) doc.fontSize(opts.size);
    if (doc.widthOfString(t) <= width) return t;
    const ell = '…';
    let lo = 0,
      hi = t.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const s = t.slice(0, mid) + ell;
      if (doc.widthOfString(s) <= width) lo = mid + 1;
      else hi = mid;
    }
    const cut = Math.max(0, lo - 1);
    return t.slice(0, cut) + ell;
  }

  function drawHeaderRow() {
    const y0 = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Tracking Code', startX, y0, { width: colCode, lineBreak: false });
    doc.text('Destination', startX + colCode, y0, { width: colDest, lineBreak: false });
    doc.text('Scanned By', startX + colCode + colDest, y0, { width: colStaff, lineBreak: false });
    doc.text('Time', startX + colCode + colDest + colStaff, y0, { width: colTime, align: 'right', lineBreak: false });
    doc.moveDown(0.3);
    doc.font('Helvetica');
  }

  drawHeaderRow();

  let y = doc.y;
  const bodyFontSize = 8.5;
  doc.fontSize(bodyFontSize);
  function formatShortDate(d: string | number | Date) {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${mi}`;
  }

  for (const s of (session as any).scans) {
    const code = s.parcel?.TrackingCode?.plainTextCode || s.parcelId;
    const dest = s.parcel?.office ? `${s.parcel.office.name} (${s.parcel.office.branchCode})` : '';
    const staff = `${s.scannedBy?.firstName || ''} ${s.scannedBy?.lastName || ''}`.trim();
    const time = formatShortDate(s.scannedAt);

    const rowH = 12;
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    if (y + rowH > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
      y = doc.y;
    }
    const codeTxt = fitTextToWidth(code, colCode, { size: bodyFontSize });
    const destTxt = fitTextToWidth(dest, colDest, { size: bodyFontSize });
    const staffTxt = fitTextToWidth(staff, colStaff, { size: bodyFontSize });
    const timeTxt = fitTextToWidth(time, colTime, { size: bodyFontSize });

    doc.text(codeTxt, startX, y, { width: colCode, lineBreak: false });
    doc.text(destTxt, startX + colCode, y, { width: colDest, lineBreak: false });
    doc.text(staffTxt, startX + colCode + colDest, y, { width: colStaff, lineBreak: false });
    doc.text(timeTxt, startX + colCode + colDest + colStaff, y, { width: colTime, align: 'right', lineBreak: false });
    y += rowH + 4;
    doc.y = y;
  }

  doc.end();
  await new Promise<void>((res) => (stream as any).on('finish', res));
  return outPath;
}

export default { generateDeliveryNote, getDeliveryNotePath };
