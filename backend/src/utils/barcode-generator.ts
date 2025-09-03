/* eslint-disable @typescript-eslint/no-var-requires */
const bwipjs = require('bwip-js');
const fs = require('fs');
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Generates a barcode PNG for a parcel or mail bag by ID.
 * @param id The parcelId or mailBagCode (scanningSessionId).
 * @param type 'parcel' | 'mailbag'
 * @param outputPath Optional output file path. If not provided, returns the PNG buffer.
 */
export async function generateBarcodeForId(
  id: string,
  type: 'parcel' | 'mailbag',
  outputPath?: string,
): Promise<Buffer | void> {
  let code: string;
  if (type === 'parcel') {
    const tracking = await prisma.trackingCode.findUnique({ where: { parcelId: id } });
    if (!tracking) throw new Error('Tracking code not found for parcel');
    code = tracking.plainTextCode;
  } else if (type === 'mailbag') {
    code = id;
  } else {
    throw new Error('Invalid type. Use "parcel" or "mailbag".');
  }

  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text: code,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
        paddingheight: 10,
      },
      (err: any, png: Buffer) => {
        if (err) return reject(err);
        if (outputPath) {
          fs.writeFileSync(outputPath, png);
          resolve();
        } else {
          resolve(png);
        }
      },
    );
  });
}

export default { generateBarcodeForId };

