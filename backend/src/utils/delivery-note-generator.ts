/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { TimeService } from "../common/time/time.service";

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
 * Generate delivery note for SORTER role
 * Columns: #, Receiver Name, Phone Number, Description, Destination, Tracking No
 * Includes: Parcel Categories, Sign-Off Section
 */
async function generateSorterDeliveryNote(
  session: any,
  doc: any,
  stream: any
): Promise<void> {
  const startX = doc.page.margins.left;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Display parcel categories if any
  const cargoTypesMap: { [key: string]: boolean } = {};
  for (const s of session.scans) {
    if (s.parcel?.cargoType) {
      cargoTypesMap[s.parcel.cargoType] = true;
    }
  }

  const cargoTypesList = Object.keys(cargoTypesMap);
  if (cargoTypesList.length > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10).text("Parcel Categories:");
    doc.font("Helvetica").fontSize(9);
    const categories = cargoTypesList.map(type => {
      // Map cargo types to display names
      if (type === "ELECTRONIC") return "ELECTRONICS & SENSITIVE DOCUMENTS";
      if (type === "DOCUMENT") return "ELECTRONICS & SENSITIVE DOCUMENTS";
      return type;
    });

    // Remove duplicates from categories
    const uniqueCategoriesMap: { [key: string]: boolean } = {};
    categories.forEach(cat => {
      uniqueCategoriesMap[cat] = true;
    });
    const uniqueCategories = Object.keys(uniqueCategoriesMap);

    doc.text(uniqueCategories.join(", "));
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(11).text("Scanned Parcels");
  doc.moveDown(0.3);

  // Define columns for sorter
  const colNum = Math.floor(contentWidth * 0.05); // 5%
  const colReceiverName = Math.floor(contentWidth * 0.20); // 20%
  const colPhoneNumber = Math.floor(contentWidth * 0.15); // 15%
  const colDescription = Math.floor(contentWidth * 0.20); // 20%
  const colDestination = Math.floor(contentWidth * 0.20); // 20%
  const colTrackingNo = contentWidth - (colNum + colReceiverName + colPhoneNumber + colDescription + colDestination); // 20%

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

  function drawTableBorders(x: number, y: number) {
    doc.lineWidth(0.5);

    // Draw horizontal lines
    doc.moveTo(x, y).lineTo(x + contentWidth, y).stroke();
    doc.moveTo(x, y + rowHeight).lineTo(x + contentWidth, y + rowHeight).stroke();

    // Draw vertical lines
    doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    doc.moveTo(x + colNum, y).lineTo(x + colNum, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName, y).lineTo(x + colNum + colReceiverName, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName + colPhoneNumber, y).lineTo(x + colNum + colReceiverName + colPhoneNumber, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName + colPhoneNumber + colDescription, y).lineTo(x + colNum + colReceiverName + colPhoneNumber + colDescription, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination, y).lineTo(x + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination, y + rowHeight).stroke();
    doc.moveTo(x + contentWidth, y).lineTo(x + contentWidth, y + rowHeight).stroke();
  }

  function drawHeaderRow() {
    const y0 = doc.y;
    drawTableBorders(startX, y0);

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("#", startX + cellPadding, y0 + cellPadding, {
      width: colNum - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Receiver Name", startX + colNum + cellPadding, y0 + cellPadding, {
      width: colReceiverName - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Phone Number", startX + colNum + colReceiverName + cellPadding, y0 + cellPadding, {
      width: colPhoneNumber - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Description", startX + colNum + colReceiverName + colPhoneNumber + cellPadding, y0 + cellPadding, {
      width: colDescription - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Destination", startX + colNum + colReceiverName + colPhoneNumber + colDescription + cellPadding, y0 + cellPadding, {
      width: colDestination - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Tracking No", startX + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination + cellPadding, y0 + cellPadding, {
      width: colTrackingNo - cellPadding * 2,
      align: "left",
      lineBreak: false,
    });

    doc.y = y0 + rowHeight;
    doc.font("Helvetica");
  }

  drawHeaderRow();

  let y = doc.y;
  const bodyFontSize = 8.5;
  doc.fontSize(bodyFontSize);

  let index = 1;
  for (const s of session.scans) {
    const receiverName = s.parcel?.receiver
      ? `${s.parcel.receiver.firstName || ""} ${s.parcel.receiver.lastName || ""}`.trim()
      : "";
    const phoneNumber = s.parcel?.receiver?.phoneNumber || "";
    const description =
      s.parcel?.description
        ?.replace(/[\r\n]+/g, " ")
        .substring(0, 20) || "";
    const dest = s.parcel?.office
      ? `${s.parcel.office.name} (${s.parcel.office.branchCode})`
      : "";
    const trackingCode = s.parcel?.TrackingCode?.plainTextCode || s.parcelId;

    const pageBottom = doc.page.height - doc.page.margins.bottom;

    // Page break check
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
      y = doc.y;
    }

    // Draw borders for data row
    drawTableBorders(startX, y);

    // Fit text
    const receiverNameTxt = fitTextToWidth(receiverName, colReceiverName, { size: bodyFontSize });
    const phoneNumberTxt = fitTextToWidth(phoneNumber, colPhoneNumber, { size: bodyFontSize });
    const descriptionTxt = fitTextToWidth(description, colDescription, { size: bodyFontSize });
    const destTxt = fitTextToWidth(dest, colDestination, { size: bodyFontSize });
    const trackingCodeTxt = fitTextToWidth(trackingCode, colTrackingNo, { size: bodyFontSize });

    // Render table row with padding
    doc.text(String(index), startX + cellPadding, y + cellPadding, {
      width: colNum - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(receiverNameTxt, startX + colNum + cellPadding, y + cellPadding, {
      width: colReceiverName - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(phoneNumberTxt, startX + colNum + colReceiverName + cellPadding, y + cellPadding, {
      width: colPhoneNumber - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(descriptionTxt, startX + colNum + colReceiverName + colPhoneNumber + cellPadding, y + cellPadding, {
      width: colDescription - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(destTxt, startX + colNum + colReceiverName + colPhoneNumber + colDescription + cellPadding, y + cellPadding, {
      width: colDestination - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(trackingCodeTxt, startX + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination + cellPadding, y + cellPadding, {
      width: colTrackingNo - cellPadding * 2,
      align: "left",
      lineBreak: false,
    });

    index++;
    y += rowHeight;
    doc.y = y;
  }

  // Add sign-off section at the bottom of the page
  const signOffHeight = 80;
  const finalPageBottom = doc.page.height - doc.page.margins.bottom;
  const signOffStartY = finalPageBottom - signOffHeight;

  // Check if current position would overlap with content
  if (doc.y > signOffStartY - 20) {
    doc.addPage();
    doc.y = doc.page.height - doc.page.margins.bottom - signOffHeight;
  } else {
    doc.y = signOffStartY;
  }

  doc.font("Helvetica-Bold").fontSize(11).text("Sign-Off", startX, doc.y, {
    underline: false,
    align: "center",
    width: contentWidth
  });
  doc.moveDown(1.5);

  const signOffRowY = doc.y;
  const halfWidth = contentWidth / 2 - 20;

  // Left side - Delivered by
  doc.font("Helvetica").fontSize(10);
  doc.text("Delivered by: _________________________", startX, signOffRowY, {
    width: halfWidth,
    align: "left"
  });
  doc.text("Signature: _____________________________", startX, signOffRowY + 20, {
    width: halfWidth,
    align: "left"
  });

  // Right side - Received by
  const rightX = startX + halfWidth + 40;
  doc.text("Received by: _________________________", rightX, signOffRowY, {
    width: halfWidth,
    align: "left"
  });
  doc.text("Signature: _____________________________", rightX, signOffRowY + 20, {
    width: halfWidth,
    align: "left"
  });

  doc.end();
  await new Promise<void>((res) => stream.on("finish", res));
}

/**
 * Generate delivery note for DISPATCHER, RECEIVER, and other roles
 * Columns: #, Receiver Name, Phone Number, Description, Destination, Tracking No
 * Includes: Parcel Categories, Sign-Off Section
 */
async function generateDispatcherDeliveryNote(
  session: any,
  doc: any,
  stream: any
): Promise<void> {
  const startX = doc.page.margins.left;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Display parcel categories if any
  const cargoTypesMap: { [key: string]: boolean } = {};
  for (const s of session.scans) {
    if (s.parcel?.cargoType) {
      cargoTypesMap[s.parcel.cargoType] = true;
    }
  }

  const cargoTypesList = Object.keys(cargoTypesMap);
  if (cargoTypesList.length > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10).text("Parcel Categories:");
    doc.font("Helvetica").fontSize(9);
    const categories = cargoTypesList.map(type => {
      // Map cargo types to display names
      if (type === "ELECTRONIC") return "Electronics & Sensitive Documents";
      if (type === "DOCUMENT") return "Electronics & Sensitive Documents";
      if (type === "FRAGILE") return "Fragile";
      if (type === "NORMAL") return "Normal";
      return type;
    });

    // Remove duplicates from categories
    const uniqueCategoriesMap: { [key: string]: boolean } = {};
    categories.forEach(cat => {
      uniqueCategoriesMap[cat] = true;
    });
    const uniqueCategories = Object.keys(uniqueCategoriesMap);

    doc.text(uniqueCategories.join(", "));
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(11).text("Scanned Parcels");
  doc.moveDown(0.3);

  // Define columns for dispatcher
  const colNum = Math.floor(contentWidth * 0.05); // 5%
  const colReceiverName = Math.floor(contentWidth * 0.20); // 20%
  const colPhoneNumber = Math.floor(contentWidth * 0.15); // 15%
  const colDescription = Math.floor(contentWidth * 0.20); // 20%
  const colDestination = Math.floor(contentWidth * 0.20); // 20%
  const colTrackingNo = contentWidth - (colNum + colReceiverName + colPhoneNumber + colDescription + colDestination); // 20%

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

  function drawTableBorders(x: number, y: number) {
    doc.lineWidth(0.5);

    // Draw horizontal lines
    doc.moveTo(x, y).lineTo(x + contentWidth, y).stroke();
    doc.moveTo(x, y + rowHeight).lineTo(x + contentWidth, y + rowHeight).stroke();

    // Draw vertical lines
    doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    doc.moveTo(x + colNum, y).lineTo(x + colNum, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName, y).lineTo(x + colNum + colReceiverName, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName + colPhoneNumber, y).lineTo(x + colNum + colReceiverName + colPhoneNumber, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName + colPhoneNumber + colDescription, y).lineTo(x + colNum + colReceiverName + colPhoneNumber + colDescription, y + rowHeight).stroke();
    doc.moveTo(x + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination, y).lineTo(x + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination, y + rowHeight).stroke();
    doc.moveTo(x + contentWidth, y).lineTo(x + contentWidth, y + rowHeight).stroke();
  }

  function drawHeaderRow() {
    const y0 = doc.y;
    drawTableBorders(startX, y0);

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("#", startX + cellPadding, y0 + cellPadding, {
      width: colNum - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Receiver Name", startX + colNum + cellPadding, y0 + cellPadding, {
      width: colReceiverName - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Phone Number", startX + colNum + colReceiverName + cellPadding, y0 + cellPadding, {
      width: colPhoneNumber - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Description", startX + colNum + colReceiverName + colPhoneNumber + cellPadding, y0 + cellPadding, {
      width: colDescription - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Destination", startX + colNum + colReceiverName + colPhoneNumber + colDescription + cellPadding, y0 + cellPadding, {
      width: colDestination - cellPadding * 2,
      lineBreak: false,
    });
    doc.text("Tracking No", startX + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination + cellPadding, y0 + cellPadding, {
      width: colTrackingNo - cellPadding * 2,
      align: "left",
      lineBreak: false,
    });

    doc.y = y0 + rowHeight;
    doc.font("Helvetica");
  }

  drawHeaderRow();

  let y = doc.y;
  const bodyFontSize = 8.5;
  doc.fontSize(bodyFontSize);

  let index = 1;
  for (const s of session.scans) {
    const receiverName = s.parcel?.receiver
      ? `${s.parcel.receiver.firstName || ""} ${s.parcel.receiver.lastName || ""}`.trim()
      : "";
    const phoneNumber = s.parcel?.receiver?.phoneNumber || "";
    const description =
      s.parcel?.description
        ?.replace(/[\r\n]+/g, " ")
        .substring(0, 20) || "";
    const dest = s.parcel?.office
      ? `${s.parcel.office.name} (${s.parcel.office.branchCode})`
      : "";
    const trackingCode = s.parcel?.TrackingCode?.plainTextCode || s.parcelId;

    const pageBottom = doc.page.height - doc.page.margins.bottom;

    // Page break check
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
      y = doc.y;
    }

    // Draw borders for data row
    drawTableBorders(startX, y);

    // Fit text
    const receiverNameTxt = fitTextToWidth(receiverName, colReceiverName, { size: bodyFontSize });
    const phoneNumberTxt = fitTextToWidth(phoneNumber, colPhoneNumber, { size: bodyFontSize });
    const descriptionTxt = fitTextToWidth(description, colDescription, { size: bodyFontSize });
    const destTxt = fitTextToWidth(dest, colDestination, { size: bodyFontSize });
    const trackingCodeTxt = fitTextToWidth(trackingCode, colTrackingNo, { size: bodyFontSize });

    // Render table row with padding
    doc.text(String(index), startX + cellPadding, y + cellPadding, {
      width: colNum - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(receiverNameTxt, startX + colNum + cellPadding, y + cellPadding, {
      width: colReceiverName - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(phoneNumberTxt, startX + colNum + colReceiverName + cellPadding, y + cellPadding, {
      width: colPhoneNumber - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(descriptionTxt, startX + colNum + colReceiverName + colPhoneNumber + cellPadding, y + cellPadding, {
      width: colDescription - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(destTxt, startX + colNum + colReceiverName + colPhoneNumber + colDescription + cellPadding, y + cellPadding, {
      width: colDestination - cellPadding * 2,
      lineBreak: false,
    });
    doc.text(trackingCodeTxt, startX + colNum + colReceiverName + colPhoneNumber + colDescription + colDestination + cellPadding, y + cellPadding, {
      width: colTrackingNo - cellPadding * 2,
      align: "left",
      lineBreak: false,
    });

    index++;
    y += rowHeight;
    doc.y = y;
  }

  // Add sign-off section at the bottom of the page
  const signOffHeight = 80;
  const finalPageBottom = doc.page.height - doc.page.margins.bottom;
  const signOffStartY = finalPageBottom - signOffHeight;

  // Check if current position would overlap with content
  if (doc.y > signOffStartY - 20) {
    doc.addPage();
    doc.y = doc.page.height - doc.page.margins.bottom - signOffHeight;
  } else {
    doc.y = signOffStartY;
  }

  doc.font("Helvetica-Bold").fontSize(11).text("Sign-Off", startX, doc.y, {
    underline: false,
    align: "center",
    width: contentWidth
  });
  doc.moveDown(1.5);

  const signOffRowY = doc.y;
  const halfWidth = contentWidth / 2 - 20;

  // Left side - Delivered by
  doc.font("Helvetica").fontSize(10);
  doc.text("Delivered by: _________________________", startX, signOffRowY, {
    width: halfWidth,
    align: "left"
  });
  doc.text("Signature: _____________________________", startX, signOffRowY + 20, {
    width: halfWidth,
    align: "left"
  });

  // Right side - Received by
  const rightX = startX + halfWidth + 40;
  doc.text("Received by: _________________________", rightX, signOffRowY, {
    width: halfWidth,
    align: "left"
  });
  doc.text("Signature: _____________________________", rightX, signOffRowY + 20, {
    width: halfWidth,
    align: "left"
  });

  doc.end();
  await new Promise<void>((res) => stream.on("finish", res));
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
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: {
            select: {
              name: true
            }
          }
        }
      },
      trip: {
        select: {
          driverName: true,
          truckReg: true,
          status: true,
          sider: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      scans: {
        include: {
          parcel: {
            include: {
              TrackingCode: true,
              office: true,
              receiver: true
            }
          },
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

  // Common header for all roles
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Delivery Note", { align: "center" });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(10).text(`Session: ${session.id}`);
  doc.text(
    `Route: ${session.route?.name || session.routeId} (${session.route?.code || ""
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
    doc.text(`Truck: ${(session as any).trip.truckReg || "N/A"}`);
    doc.text(`Driver: ${(session as any).trip.driverName || "N/A"}`);
    const sider = (session as any).trip.sider;
    const siderName = sider
      ? `${sider.firstName || ""} ${sider.lastName || ""}`.trim()
      : "N/A";
    doc.text(`Sider: ${siderName}`);
  }

  doc.text(`Started: ${time.format(session.startedAt, "dd/LL/yyyy HH:mm")}`);
  if ((session as any).closedAt)
    doc.text(
      `Closed: ${time.format(
        (session as any).closedAt as unknown as string,
        "dd/LL/yyyy HH:mm"
      )}`
    );

  // Check user role and call appropriate function
  const userRole = (session as any).user?.role?.name?.toLowerCase();
  const isSorter = userRole === "sorter";

  if (isSorter) {
    await generateSorterDeliveryNote(session, doc, stream);
  } else {
    await generateDispatcherDeliveryNote(session, doc, stream);
  }

  return outPath;
}

export default { generateDeliveryNote, getDeliveryNotePath };