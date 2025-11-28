/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { TimeService } from "../common/time/time.service";
import { string } from "joi";

const time = new TimeService();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPdfKit(): any | null {
  try {
    return require("pdfkit");
  } catch (e) {
    console.warn("pdfkit not installed. Skipping delivery note generation.");
    return null;
  }
}

export function getDeliveryNotePath(sessionId: string): string {
  const dir = path.resolve(process.cwd(), "delivery-notes");
  ensureDir(dir);
  return path.join(dir, `session-${sessionId}.pdf`);
}

/**
 * Generate a delivery note PDF for a session.
 * If the output already exists and force=false, it returns the existing path.
 */
export async function generateDeliveryNote(
  sessionId: string,
  opts: { force?: boolean } = {}
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
      trip: { select: { driverName: true, truckReg: true, status: true } },
      scans: {
        include: {
          parcel: { include: { TrackingCode: true, office: true } },
          scannedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scannedAt: "asc" },
      },
    },
  });
  if (!session) throw new Error("Session not found");

  const outPath = getDeliveryNotePath(sessionId);
  if (!force && fs.existsSync(outPath)) return outPath;

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Delivery Note", { align: "center" });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(10).text(`Session: ${session.id}`);
  doc.text(
    `Route: ${session.route?.name || session.routeId} (${
      session.route?.code || ""
    })`
  );
  doc.text(`Office: ${session.office?.name} (${session.office?.branchCode})`);

  doc.text(`Mode: ${session.mode}`);
  doc.text(
    `Staff: ${(
      (session.user?.firstName || "") +
      " " +
      (session.user?.lastName || "")
    ).trim()}`
  );

  // Include trip details if session is linked to a trip
  if ((session as any).trip) {
    doc.text(`Driver: ${(session as any).trip.driverName || "N/A"}`);
    doc.text(`Truck Registration: ${(session as any).trip.truckReg || "N/A"}`);
  }

  doc.text(`Started: ${time.format(session.startedAt, "dd/LL/yyyy HH:mm")}`);
  if ((session as any).closedAt)
    doc.text(
      `Closed: ${time.format(
        (session as any).closedAt as unknown as string,
        "dd/LL/yyyy HH:mm"
      )}`
    );

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(11).text("Scanned Parcels");
  doc.moveDown(0.3);
  const startX = doc.page.margins.left;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const colNum = Math.floor(contentWidth * 0.07); // 7%
  const colCode = Math.floor(contentWidth * 0.33); // 33%
  const colDest = Math.floor(contentWidth * 0.3); // 30%
  const colStaff = Math.floor(contentWidth * 0.17); // 17%
  const colTime = contentWidth - (colNum + colCode + colDest + colStaff);

  const rowHeight = 18;
  const cellPadding = 4;

  function fitTextToWidth(
    text: string,
    width: number,
    opts: { font?: string; size?: number } = {}
  ) {
    const t = String(text ?? "");
    if (!t) return "";
    if (opts.font) doc.font(opts.font);
    if (opts.size) doc.fontSize(opts.size);
    if (doc.widthOfString(t) <= width - cellPadding * 2) return t;
    const ell = "…";
    let lo = 0,
      hi = t.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const s = t.slice(0, mid) + ell;
      if (doc.widthOfString(s) <= width - cellPadding * 2) lo = mid + 1;
      else hi = mid;
    }
    const cut = Math.max(0, lo - 1);
    return t.slice(0, cut) + ell;
  }

  function drawTableBorders(x: number, y: number, isHeader: boolean = false) {
    doc.lineWidth(0.5);

    // Draw horizontal lines
    doc
      .moveTo(x, y)
      .lineTo(x + contentWidth, y)
      .stroke();
    doc
      .moveTo(x, y + rowHeight)
      .lineTo(x + contentWidth, y + rowHeight)
      .stroke();

    // Draw vertical lines
    doc
      .moveTo(x, y)
      .lineTo(x, y + rowHeight)
      .stroke();
    doc
      .moveTo(x + colNum, y)
      .lineTo(x + colNum, y + rowHeight)
      .stroke();
    doc
      .moveTo(x + colNum + colCode, y)
      .lineTo(x + colNum + colCode, y + rowHeight)
      .stroke();
    doc
      .moveTo(x + colNum + colCode + colDest, y)
      .lineTo(x + colNum + colCode + colDest, y + rowHeight)
      .stroke();
    doc
      .moveTo(x + colNum + colCode + colDest + colStaff, y)
      .lineTo(x + colNum + colCode + colDest + colStaff, y + rowHeight)
      .stroke();
    doc
      .moveTo(x + contentWidth, y)
      .lineTo(x + contentWidth, y + rowHeight)
      .stroke();
  }

  function drawHeaderRow() {
    const y0 = doc.y;

    // Draw borders for header
    drawTableBorders(startX, y0, true);

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("#", startX + cellPadding, y0 + cellPadding, {
      width: colNum - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Tracking Code", startX + colNum + cellPadding, y0 + cellPadding, {
      width: colCode - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(
      "Destination",
      startX + colNum + colCode + cellPadding,
      y0 + cellPadding,
      {
        width: colDest - cellPadding * 2,
        lineBreak: false,
      }
    );
    doc.text(
      "Scanned By",
      startX + colNum + colCode + colDest + cellPadding,
      y0 + cellPadding,
      {
        width: colStaff - cellPadding * 2,
        lineBreak: false,
      }
    );
    doc.text(
      "Time",
      startX + colNum + colCode + colDest + colStaff + cellPadding,
      y0 + cellPadding,
      {
        width: colTime - cellPadding * 2,
        align: "left",
        lineBreak: false,
      }
    );

    doc.y = y0 + rowHeight;
    doc.font("Helvetica");
  }

  drawHeaderRow();

  let y = doc.y;
  const bodyFontSize = 8.5;
  doc.fontSize(bodyFontSize);

  function formatShortDate(d: string | number | Date) {
    return time.format(d, "dd/LL HH:mm");
  }

  let index = 1;
  for (const s of (session as any).scans) {
    const code = s.parcel?.TrackingCode?.plainTextCode || s.parcelId;
    const dest = s.parcel?.office
      ? `${s.parcel.office.name} (${s.parcel.office.branchCode})`
      : "";
    const staff = `${s.scannedBy?.firstName || ""} ${
      s.scannedBy?.lastName || ""
    }`.trim();
    const timeStr = formatShortDate(s.scannedAt);

    const pageBottom = doc.page.height - doc.page.margins.bottom;

    // Page break check
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
      y = doc.y;
    }

    // Draw borders for data row
    drawTableBorders(startX, y, false);

    // Fit text
    const codeTxt = fitTextToWidth(code, colCode, { size: bodyFontSize });
    const destTxt = fitTextToWidth(dest, colDest, { size: bodyFontSize });
    const staffTxt = fitTextToWidth(staff, colStaff, { size: bodyFontSize });
    const timeTxt = fitTextToWidth(timeStr, colTime, { size: bodyFontSize });

    // Render table row with padding
    doc.text(String(index), startX + cellPadding, y + cellPadding, {
      width: colNum - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(codeTxt, startX + colNum + cellPadding, y + cellPadding, {
      width: colCode - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(
      destTxt,
      startX + colNum + colCode + cellPadding,
      y + cellPadding,
      {
        width: colDest - cellPadding * 2,
        lineBreak: false,
      }
    );
    doc.text(
      staffTxt,
      startX + colNum + colCode + colDest + cellPadding,
      y + cellPadding,
      {
        width: colStaff - cellPadding * 2,
        lineBreak: false,
      }
    );
    doc.text(
      timeTxt,
      startX + colNum + colCode + colDest + colStaff + cellPadding,
      y + cellPadding,
      {
        width: colTime - cellPadding * 2,
        align: "left",
        lineBreak: false,
      }
    );

    // Next
    index++;
    y += rowHeight;
    doc.y = y;
  }

  doc.end();
  await new Promise<void>((res) => (stream as any).on("finish", res));
  return outPath;
}

export default { generateDeliveryNote, getDeliveryNotePath };
