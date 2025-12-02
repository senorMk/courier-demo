import { Query, Get } from "@nestjs/common";
import {
  Body,
  Controller,
  Post,
  UseGuards,
  SetMetadata,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CustomerService } from "./customer.service";
import { RolesGuard } from "../common/guards/roles.guard";

const CUSTOMER_WRITE_ROLES = [
  "managing-director",
  "operations-officer",
  "supervisor",
  "cashier",
] as const;

const CUSTOMER_READ_ROLES = [
  ...CUSTOMER_WRITE_ROLES,
  "customer-service-agent",
  "customer-service-director",
] as const;

@Controller("api/v1/customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post("create")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", CUSTOMER_WRITE_ROLES)
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
      throw new BadRequestException("Missing required customer property");
    }
    return this.customerService.createCustomer(body);
  }

  @Get("paginated")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", CUSTOMER_READ_ROLES)
  async getPaginated(
    @Query("page") page: number = 1,
    @Query("pageSize") pageSize: number = 10,
    @Query("search") search?: string
  ) {
    const cleanSearch = typeof search === "string" ? search.trim() : undefined;
    return this.customerService.getCustomersPaginated(
      Number(page),
      Number(pageSize),
      cleanSearch && cleanSearch.length ? cleanSearch : undefined
    );
  }

  /**
   * Search customers by first name, last name, id number, email, or phone number
   * @param query search string
   */
  @Get("search")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata("roles", CUSTOMER_READ_ROLES)
  async searchCustomers(@Query("q") q: string) {
    if (!q || q.trim().length === 0) {
      return [];
    }
    return this.customerService.searchCustomers(q);
  }
}
