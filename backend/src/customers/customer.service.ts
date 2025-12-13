import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Customer, Prisma } from "@prisma/client";

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(data: {
    firstName: string;
    lastName?: string;
    phoneNumber: string;
    emailAddress?: string;
    idNumber?: string;
  }): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async getCustomersPaginated(
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const trimmed = search?.trim();
    const where: Prisma.CustomerWhereInput | undefined = trimmed
      ? {
          OR: [
            {
              firstName: {
                contains: trimmed,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              lastName: {
                contains: trimmed,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              idNumber: {
                contains: trimmed,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              emailAddress: {
                contains: trimmed,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              phoneNumber: {
                contains: trimmed,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : undefined;
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Search customers by first name, last name, id number, email, or phone number
   * Limited to 50 results
   */
  async searchCustomers(q: string) {
    return this.prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { idNumber: { contains: q, mode: "insensitive" } },
          { emailAddress: { contains: q, mode: "insensitive" } },
          { phoneNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  }
}