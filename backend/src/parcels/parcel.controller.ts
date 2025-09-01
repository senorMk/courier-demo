import { Query, Get } from "@nestjs/common";
import {
  Body,
  Controller,
  Post,
  Param,
  UseGuards,
  SetMetadata,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { ParcelService } from "./parcel.service";
import { Response } from "express";
import { Res } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as archiver from "archiver";

@Controller("api/v1/parcels")
export class ParcelController {
  constructor(private readonly parcelService: ParcelService) {}

  @Post("create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async create(
    @Body()
    body:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
          size?: "SMALL" | "MEDIUM" | "LARGE";
          payment?: {
            method: "CASH" | "MOBILE_MONEY" | "CARD";
            amount: number;
            reference?: string;
          };
        }
      | {
          customer: {
            firstName: string;
            lastName: string;
            phoneNumber: string;
            emailAddress?: string;
            idNumber?: string;
          };
          receiver: {
            firstName: string;
            lastName: string;
            phoneNumber: string;
            emailAddress?: string;
            idNumber?: string;
          };
          officeId: string;
          size: "SMALL" | "MEDIUM" | "LARGE";
          payment: {
            method: "CASH" | "MOBILE_MONEY" | "CARD";
            amount: number;
            reference?: string;
          };
        }
  ) {
    return this.parcelService.createParcel(body);
  }

  @Get("paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10
  ) {
    return this.parcelService.getParcelsPaginated(
      Number(page),
      Number(pageSize)
    );
  }

  @Post(":parcelId/items")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async addItem(
    @Param("parcelId") parcelId: string,
    @Body()
    body: {
      quantity: number;
      description: string;
      pricePerUnit: number;
      value: number;
      amount: number;
    }
  ) {
    return this.parcelService.addParcelItem(parcelId, body);
  }

  @Get(":parcelId/items")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async getParcelItems(@Param("parcelId") parcelId: string) {
    return this.parcelService.getParcelItems(parcelId);
  }

  @Get(":parcelId/receipts/download")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async downloadReceipts(
    @Param("parcelId") parcelId: string,
    @Res() res: Response
  ) {
    const receiptsDir = path.resolve(process.cwd(), "receipts");
    const files = [
      path.join(receiptsDir, `parcel-${parcelId}-sender.pdf`),
      path.join(receiptsDir, `parcel-${parcelId}-sticker.pdf`),
      path.join(receiptsDir, `parcel-${parcelId}-accounts.pdf`),
    ];

    try {
      const {
        generateReceiptsForParcel,
      } = require("../utils/receipt-generator");
      await generateReceiptsForParcel(parcelId);
    } catch (e) {}

    res.setHeader("Content-Type", "application/zip, application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=parcel-${parcelId}-receipts.zip`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => res.status(500).end(String(err)));
    archive.pipe(res);

    for (const f of files) {
      if (fs.existsSync(f)) {
        archive.file(f, { name: path.basename(f) });
      }
    }
    await archive.finalize();
  }

  @Get(":parcelId/receipts/:type")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async downloadReceipt(
    @Param("parcelId") parcelId: string,
    @Param("type") type: string,
    @Res() res: Response
  ) {
    const valid = ["sender", "sticker", "accounts"];
    if (!valid.includes(type)) {
      throw new BadRequestException("Invalid receipt type");
    }
    const receiptsDir = path.resolve(process.cwd(), "receipts");
    const filePath = path.join(receiptsDir, `parcel-${parcelId}-${type}.pdf`);
    try {
      const {
        generateReceiptsForParcel,
      } = require("../utils/receipt-generator");
      await generateReceiptsForParcel(parcelId);
    } catch (e) {}

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("Receipt not available");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=parcel-${parcelId}-${type}.pdf`
    );
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    fs.createReadStream(filePath).pipe(res);
  }
}
