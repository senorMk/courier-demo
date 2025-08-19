import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CustomerService } from "./customer.service";
import { CustomerController } from "./customer.controller";

@Module({
  imports: [PrismaModule],
  providers: [CustomerService],
  controllers: [CustomerController],
})
export class CustomerModule {}
