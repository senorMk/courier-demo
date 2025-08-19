import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RoutesService } from "./routes.service";
import { RoutesController } from "./routes.controller";

@Module({
  imports: [PrismaModule],
  providers: [RoutesService],
  controllers: [RoutesController],
})
export class RoutesModule {}
