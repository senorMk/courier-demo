import { Query, Get } from "@nestjs/common";
import {
  Body,
  Controller,
  Post,
  Param,
  UseGuards,
  SetMetadata,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { ParcelService } from "./parcel.service";
import { Response, Request } from "express";
import { Res, Req } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as archiver from "archiver";
import { generateReceiptsForParcel } from "../utils/receipt-generator";
import { TimeService } from "../common/time/time.service";

const PARCEL_CREATE_ROLES = [
  "managing-director",
  "operations-officer",
  "supervisor",
  "cashier",
] as const;

const PARCEL_VIEW_ROLES = [
  ...PARCEL_CREATE_ROLES,
  "customer-service-agent",
  "customer-service-director",
  "dispatcher",
  "sorter",
  "receiver",
] as const;

const PARCEL_RECEIPT_ROLES = [
  "managing-director",
  "operations-officer",
  "supervisor",
  "cashier",
] as const;

const PARCEL_COLLECTION_ROLES = [
  "managing-director",
  "operations-officer",
  "supervisor",
  "cashier",
] as const;

@Controller("api/v1/parcels")
export class ParcelController {
  constructor(
    private readonly parcelService: ParcelService,
    private readonly time: TimeService
  ) {}

  @Post("create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_CREATE_ROLES)
  async create(
    @Body()
    body:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
          description: string;
          value: number;
          size?: "SMALL" | "MEDIUM" | "LARGE";
          cargoType?: "NORMAL" | "FRAGILE" | "ELECTRONIC_SENSITIVE";
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
          description: string;
          value: number;
          size: "SMALL" | "MEDIUM" | "LARGE";
          cargoType?: "NORMAL" | "FRAGILE" | "ELECTRONIC_SENSITIVE";
          payment: {
            method: "CASH" | "MOBILE_MONEY" | "CARD";
            amount: number;
            reference?: string;
          };
        },
    @Req() req: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const enriched = { ...(body as any) };
      if (!enriched.sendingOfficeId && user?.officeId) {
        enriched.sendingOfficeId = user.officeId;
      }
      return await this.parcelService.createParcel(enriched as any);
    } catch (e) {
      console.error("ParcelController.create error:", e);
      throw e;
    }
  }

  @Get("paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10,
    @Query("search") search?: string
  ) {
    try {
      return await this.parcelService.getParcelsPaginated(
        Number(page),
        Number(pageSize),
        search
      );
    } catch (e) {
      console.error("ParcelController.getPaginated error:", e);
      throw e;
    }
  }

  @Get(":parcelId/track")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async getParcelTrackHistory(@Param("parcelId") parcelId: string) {
    try {
      return await this.parcelService.getParcelScanHistory(parcelId);
    } catch (e) {
      console.error("ParcelController.getParcelTrackHistory error:", e);
      throw e;
    }
  }

  @Get(":parcelId/receipts/download")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_RECEIPT_ROLES)
  async downloadReceipts(
    @Param("parcelId") parcelId: string,
    @Res() res: Response
  ) {
    try {
      const receiptsDir = path.resolve(process.cwd(), "receipts");
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      const files = [
        path.join(receiptsDir, `parcel-${parcelId}-sender.pdf`),
        path.join(receiptsDir, `parcel-${parcelId}-sticker.pdf`),
        path.join(receiptsDir, `parcel-${parcelId}-accounts.pdf`),
      ];

      try {
        await generateReceiptsForParcel(parcelId);
      } catch (e) {
        console.error("ParcelController.downloadReceipts generate error:", e);
      }

      res.setHeader(
        "Content-Type",
        "application/zip, application/octet-stream"
      );
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
    } catch (e) {
      console.error("ParcelController.downloadReceipts error:", e);
      throw e;
    }
  }

  @Get(":parcelId/receipts/:type")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_RECEIPT_ROLES)
  async downloadReceipt(
    @Param("parcelId") parcelId: string,
    @Param("type") type: string,
    @Res() res: Response
  ) {
    try {
      const valid = ["sender", "sticker", "accounts"];
      if (!valid.includes(type)) {
        throw new BadRequestException("Invalid receipt type");
      }
      const receiptsDir = path.resolve(process.cwd(), "receipts");
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      const filePath = path.join(receiptsDir, `parcel-${parcelId}-${type}.pdf`);
      try {
        await generateReceiptsForParcel(parcelId);
      } catch (e) {
        console.error("ParcelController.downloadReceipt generate error:", e);
      }

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
    } catch (e) {
      console.error("ParcelController.downloadReceipt error:", e);
      throw e;
    }
  }

  @Post(":parcelId/collect")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async markCollected(@Param("parcelId") parcelId: string) {
    try {
      return await this.parcelService.markCollected(parcelId);
    } catch (e) {
      console.error("ParcelController.markCollected error:", e);
      throw e;
    }
  }

  @Get("search")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async searchByCode(@Query("code") code: string) {
    try {
      if (!code || !code.trim()) {
        throw new BadRequestException("Tracking code is required");
      }
      return await this.parcelService.findByTrackingCode(code.trim());
    } catch (e) {
      console.error("ParcelController.searchByCode error:", e);
      throw e;
    }
  }

  @Post("collect-by-code")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_COLLECTION_ROLES)
  async collectByCode(@Body() body: { code: string }) {
    try {
      if (!body?.code)
        throw new BadRequestException("Tracking code is required");
      return await this.parcelService.collectByCode(body.code.trim());
    } catch (e) {
      console.error("ParcelController.collectByCode error:", e);
      throw e;
    }
  }

  @Get("track/:trackingCode")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for tracking
  async trackParcel(@Param("trackingCode") trackingCode: string) {
    try {
      // Basic validation
      if (!trackingCode || !trackingCode.trim()) {
        throw new BadRequestException("Tracking code is required");
      }

      const cleanCode = trackingCode.trim().toUpperCase();

      // Validate tracking code format (basic pattern check)
      const trackingCodePattern = /^[A-Z]{2}-\d{3}-\d{3}-\d+$/;
      if (!trackingCodePattern.test(cleanCode)) {
        throw new NotFoundException("Invalid tracking code format");
      }

      return await this.parcelService.getPublicTrackingInfo(cleanCode);
    } catch (e) {
      // Don't log sensitive information, just log that an attempt was made
      console.error("ParcelController.trackParcel attempt:", {
        codeLength: trackingCode?.length,
        timestamp: this.time.nowISO(),
      });

      // Always return NotFoundException for security (don't reveal if parcel exists)
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new NotFoundException("Parcel not found");
    }
  }
}
