import { Body, Controller, Post, UseGuards, SetMetadata, BadRequestException } from "@nestjs/common";
import { AuthGuard } from '@nestjs/passport';
import { CustomerService } from "./customer.service";
  import { RolesGuard } from "../common/guards/roles.guard";

@Controller("api/v1/customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post("create")
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SetMetadata("roles", ["managing-director"])
  async create(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
      emailAddress?: string;
      idNumber?: string;
    }
  ) {
    const { firstName, lastName, phoneNumber } = body;
    if (!firstName || !lastName || !phoneNumber) {
      throw new BadRequestException('Missing required customer property');
    }
    return this.customerService.createCustomer(body);
  }
}
