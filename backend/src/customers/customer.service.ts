import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Customer } from "@prisma/client";

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    emailAddress?: string;
    idNumber?: string;
  }): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async getCustomersPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ skip, take: pageSize }),
      this.prisma.customer.count(),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
