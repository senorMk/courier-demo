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
  "cashier",
] as const;

const PARCEL_VIEW_ROLES = [
  ...PARCEL_CREATE_ROLES,
  "supervisor",
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
  "dispatcher",
  "sorter",
  "cashier",
] as const;

const PARCEL_COLLECTION_ROLES = [
  "managing-director",
  "operations-officer",
  "supervisor",
  "cashier",
] as const;

const PARCEL_RECEIVER_ROLES = [
  "managing-director",
  "operations-officer",
  "supervisor",
  "receiver",
] as const;

const PARCEL_CANCEL_ROLES = [
  "supervisor",
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
        cargoType?: "NORMAL" | "FRAGILE" | "ELECTRONIC" | "ELECTRONIC_SENSITIVE" | "DOCUMENT";
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
        cargoType?: "NORMAL" | "FRAGILE" | "ELECTRONIC" | "ELECTRONIC_SENSITIVE" | "DOCUMENT";
        payment: {
          method: "CASH" | "MOBILE_MONEY" | "CARD";
          amount: number;
          reference?: string;
        };
      }
    ,

    @Req() req: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const enriched = { ...(body as any) };
      if (!enriched.sendingOfficeId && user?.officeId) {
        enriched.sendingOfficeId = user.officeId;
      }
      const cashierId = user?.userId || user?.id;
      return await this.parcelService.createParcel(enriched as any, {
        requireReceivable: true,
        cashierId: cashierId
      });
    } catch (e) {
      console.error("ParcelController.create error:", e);
      throw e;
    }
  } catch (e) {
    console.error("ParcelController.create error:", e);
    throw e;
  }

  @Post(":parcelId/cancel")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_CANCEL_ROLES)
  async cancelParcel(
    @Param("parcelId") parcelId: string,
    @Body() body: { reason: string },
    @Req() req: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const userId = user?.userId || user?.id;
      if (!userId) {
        throw new BadRequestException("User ID not found");
      }

      return await this.parcelService.cancelParcel(parcelId, userId, body?.reason);
    } catch (e) {
      console.error("ParcelController.cancelParcel error:", e);
      throw e;
    }
  }

  @Get("paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("cashierId") cashierId?: string,
    @Req() req?: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const userRole = user?.role;
      const userId = user?.userId || user?.id;

      // Supervisors can only view parcels from their own office
      let sendingOfficeId: string | undefined;
      if (userRole === 'supervisor' && user?.officeId) {
        sendingOfficeId = user.officeId;
      }

      // Cashiers can only view parcels they created
      let createdById: string | undefined;
      if (userRole === 'cashier' && userId) {
        createdById = userId;
      }

      return await this.parcelService.getParcelsPaginated(
        Number(page),
        Number(pageSize),
        search,
        status,
        startDate,
        endDate,
        sendingOfficeId,
        cashierId,
        createdById
      );
    } catch (e) {
      console.error('ParcelController.getPaginated error:', e);
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
        path.join(receiptsDir, `parcel-${parcelId}-original.pdf`),
        path.join(receiptsDir, `parcel-${parcelId}-copy-of-original.pdf`),
        path.join(receiptsDir, `parcel-${parcelId}-sticker.pdf`),
        path.join(receiptsDir, `parcel-${parcelId}-accounts.pdf`),
      ];

    
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
      const valid = ["original", "copy-of-original", "sticker", "accounts"];
      if (!valid.includes(type)) {
        throw new BadRequestException("Invalid receipt type");
      }
      const receiptsDir = path.resolve(process.cwd(), "receipts");
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      const filePath = path.join(receiptsDir, `parcel-${parcelId}-${type}.pdf`);

      // If file doesn't exist, try to regenerate receipts
      if (!fs.existsSync(filePath)) {
        try {
          // Get parcel with payment info to extract cashierId
          const parcel = await this.parcelService.findByIdWithPayment(parcelId);
          if (!parcel) {
            throw new BadRequestException("Parcel not found");
          }
          const cashierId = parcel.payment?.cashierId || undefined;
          await generateReceiptsForParcel(parcelId, cashierId);
        } catch (regenerateError) {
          console.error("Failed to regenerate receipt:", regenerateError);
          throw new BadRequestException("Receipt not available");
        }
      }

      // Check again after regeneration attempt
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

  @Get("descriptions/search")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async searchDescriptions(@Query("q") query: string) {
    try {
      const descriptions = await this.parcelService.searchDescriptions(query || "");
      return { descriptions };
    } catch (e) {
      console.error("ParcelController.searchDescriptions error:", e);
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

      // First try strict validation for new format (no dashes)
      // Format: routeCode + destinationCode + branchCode + parcelNumber
      // Example: ABCDEFGHI123
      const strictPattern = /^[A-Z0-9]{6,36}\d+$/;

      if (strictPattern.test(cleanCode)) {
        return await this.parcelService.getPublicTrackingInfo(cleanCode);
      }

      // Fallback: try old format with dashes for backward compatibility
      const legacyPattern = /^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}-[A-Z0-9]{2,12}-\d+$/;
      if (legacyPattern.test(cleanCode)) {
        // Try direct database lookup for old format
        try {
          return await this.parcelService.getPublicTrackingInfo(cleanCode);
        } catch (dbError) {
          // If database lookup fails, return invalid format error
          throw new NotFoundException("Invalid tracking code format");
        }
      }

      throw new NotFoundException("Invalid tracking code format");
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

  @Post(":parcelId/mark-arrived")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_RECEIVER_ROLES)
  async markParcelArrived(@Param("parcelId") parcelId: string) {
    try {
      return await this.parcelService.markParcelArrived(parcelId);
    } catch (e) {
      console.error("ParcelController.markParcelArrived error:", e);
      throw e;
    }
  }

  @Post(":parcelId/send-reminder")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_RECEIVER_ROLES)
  async sendReminder(
    @Param("parcelId") parcelId: string,
    @Req() req: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const userId = user?.userId || user?.id;

      if (!userId) {
        throw new BadRequestException("User ID not found");
      }

      await this.parcelService.sendParcelReminder(parcelId, userId);
      return {
        success: true,
        message: "Reminder sent successfully",
      };
    } catch (e) {
      console.error("ParcelController.sendReminder error:", e);
      throw e;
    }
  }

  @Get("overdue")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_RECEIVER_ROLES)
  async getOverdueParcels(
    @Query("officeId") officeId?: string,
    @Req() req?: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const userOfficeId = user?.officeId;

      // If user has an office, filter by their office unless they explicitly request another
      const effectiveOfficeId = officeId || userOfficeId;

      return await this.parcelService.getOverdueParcels(effectiveOfficeId);
    } catch (e) {
      console.error("ParcelController.getOverdueParcels error:", e);
      throw e;
    }
  }

  @Get("export/csv")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async exportCSV(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("cashierId") cashierId?: string,
    @Res() res?: Response,
    @Req() req?: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const userRole = user?.role?.name;
      const userId = user?.userId || user?.id;

      // Supervisors can only export parcels from their own office
      let sendingOfficeId: string | undefined;
      if (userRole === 'supervisor' && user?.officeId) {
        sendingOfficeId = user.officeId;
      }

      // Cashiers can only export parcels they created
      let createdById: string | undefined;
      if (userRole === 'cashier' && userId) {
        createdById = userId;
      }

      const csvContent = await this.parcelService.exportParcelsToCSV(
        search,
        status,
        startDate,
        endDate,
        sendingOfficeId,
        cashierId,
        createdById
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=parcels-export-${new Date().toISOString().split('T')[0]}.csv`
      );
      res.send(csvContent);
    } catch (e) {
      console.error("ParcelController.exportCSV error:", e);
      throw e;
    }
  }

  @Get("export/pdf")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", PARCEL_VIEW_ROLES)
  async exportPDF(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("cashierId") cashierId?: string,
    @Res() res?: Response,
    @Req() req?: Request
  ) {
    try {
      const user: any = (req as any)?.user || {};
      const userRole = user?.role?.name;
      const userId = user?.userId || user?.id;

      // Supervisors can only export parcels from their own office
      let sendingOfficeId: string | undefined;
      if (userRole === 'supervisor' && user?.officeId) {
        sendingOfficeId = user.officeId;
      }

      // Cashiers can only export parcels they created
      let createdById: string | undefined;
      if (userRole === 'cashier' && userId) {
        createdById = userId;
      }

      const pdfBuffer = await this.parcelService.exportParcelsToPDF(
        search,
        status,
        startDate,
        endDate,
        sendingOfficeId,
        cashierId,
        createdById
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=parcels-export-${new Date().toISOString().split('T')[0]}.pdf`
      );
      res.send(pdfBuffer);
    } catch (e) {
      console.error("ParcelController.exportPDF error:", e);
      throw e;
    }
  }

  @Post("fix-parcel-created-by")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async fixParcelCreatedBy() {
    try {
      return await this.parcelService.fixParcelsWithNullCreatedBy();
    } catch (e) {
      console.error("ParcelController.fixParcelCreatedBy error:", e);
      throw e;
    }
  }
}