const bwipjs = require("bwip-js");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Generates a barcode PNG for a parcel or mail bag by ID.
 * @param {string} id - The parcelId or mailBagCode (scanningSessionId).
 * @param {'parcel'|'mailbag'} type - Type of code to generate.
 * @param {string} [outputPath] - Optional output file path. If not provided, returns the PNG buffer.
 * @returns {Promise<Buffer|undefined>} PNG buffer if no outputPath, else undefined.
 */
async function generateBarcodeForId(id, type, outputPath) {
  let code;
  if (type === "parcel") {
    const tracking = await prisma.trackingCode.findUnique({
      where: { parcelId: id },
    });

    if (!tracking) {
      throw new Error("Tracking code not found for parcel");
    }

    code = tracking.plainTextCode;
  } else if (type === "mailbag") {
    code = id;
  } else {
    throw new Error('Invalid type. Use "parcel" or "mailbag".');
  }
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: code,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
        paddingheight: 10,
      },
      (err, png) => {
        if (err) return reject(err);
        if (outputPath) {
          fs.writeFileSync(outputPath, png);
          resolve();
        } else {
          resolve(png);
        }
      }
    );
  });
}

module.exports = { generateBarcodeForId };
