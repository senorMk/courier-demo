import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  BadRequestException,
  Header,
  Res,
} from "@nestjs/common";
import { Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ScanningService } from "./scanning.service";
import { Request, Response } from "express";
import { RolesGuard } from "../common/guards/roles.guard";
import { SetMetadata } from "@nestjs/common";
import { Req } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  generateDeliveryNote,
  getDeliveryNotePath,
} from "../utils/delivery-note-generator";
const fs = require("fs");

const SCANNING_ROLES = [
  "managing-director",
  "cashier",
  "supervisor",
  "driver",
  "assistant-driver",
  "dispatcher",
  "operations-officer",
];

interface JwtUser {
  sub?: string;
  userId?: string;
  officeId?: string | null;
  role: string;
}

@Controller("api/v1/scanning")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@SetMetadata("roles", SCANNING_ROLES)
export class ScanningController {
  constructor(
    private service: ScanningService,
    private prisma: PrismaService
  ) {}

  @Post("start")
  async start(
    @Req() req: Request,
    @Body()
    body: {
      routeId: string;
      officeId?: string;
      mode: "bag" | "individual";
      staffId?: string;
      tripId?: string;
    }
  ) {
    const user = req.user as JwtUser;
    let officeId = body.officeId ?? user.officeId ?? null;
    const staffId = body.staffId || user.sub || (user as any).userId;
    if (!officeId) {
      if (!staffId) throw new BadRequestException("User context missing");
      const dbUser = await this.prisma.user.findUnique({
        where: { id: staffId },
        select: { officeId: true },
      });
      officeId = dbUser?.officeId ?? null;
    }
    if (!officeId) throw new BadRequestException("Office context required");
    return this.service.startSession(
      staffId,
      officeId,
      body.routeId,
      body.mode,
      body.tripId
    );
  }

  @Post(":id/scan")
  async scan(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { code?: string; parcelId?: string }
  ) {
    const user = req.user as JwtUser;
    // Prefer plain text tracking code; fall back to parcelId for compatibility
    const code = body.code;
    if (code && code.trim()) {
      return this.service.scanParcel(
        id,
        code.trim(),
        user.sub || (user as any).userId
      );
    }
    if (body.parcelId) {
      // Legacy path: accept parcelId directly
      return this.service.scanParcelByParcelId(
        id,
        body.parcelId,
        user.sub || (user as any).userId
      );
    }
    throw new BadRequestException("Provide tracking code in 'code'");
  }

  @Post(":id/close")
  async close(@Param("id") id: string) {
    return this.service.closeSession(id);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.service.deleteSession(id);
  }

  @Get(":id/delivery-note")
  async deliveryNote(@Param("id") id: string, @Res() res: Response) {
    const outPath = getDeliveryNotePath(id);
    if (fs.existsSync(outPath)) {
      const filename = `delivery-note-session-${id}.pdf`;
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${filename}\"`
      );
      return fs.createReadStream(outPath).pipe(res);
    }

    const session = await this.prisma.scanningSession.findUnique({
      where: { id },
      select: { closedAt: true },
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (!session.closedAt) {
      return res
        .status(409)
        .json({ message: "Delivery note available after session is closed" });
    }

    const path = await generateDeliveryNote(id, { force: false });
    const filename = `delivery-note-session-${id}.pdf`;
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${filename}\"`
    );
    const stream = fs.createReadStream(path);
    stream.on("error", () => res.sendStatus(404));
    stream.pipe(res);
  }

  @Get("paginated")
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10,
    @Query("officeId") officeId?: string
  ) {
    return this.service.getPaginatedSessions(
      Number(page),
      Number(pageSize),
      officeId
    );
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.service.getSession(id);
  }
}
