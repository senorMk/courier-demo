import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ParcelService } from "./parcel.service";
import { ParcelController } from "./parcel.controller";

@Module({
  imports: [PrismaModule],
  providers: [ParcelService],
  controllers: [ParcelController],
})
export class ParcelModule {}
