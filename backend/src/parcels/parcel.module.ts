import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TimeModule } from "../common/time/time.module";
import { SystemSettingsModule } from "../system-settings/system-settings.module";
import { ParcelService } from "./parcel.service";
import { ParcelController } from "./parcel.controller";

@Module({
  imports: [PrismaModule, TimeModule, SystemSettingsModule],
  providers: [ParcelService],
  controllers: [ParcelController],
})
export class ParcelModule {}
