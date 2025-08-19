import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    emailAddress?: string;
    idNumber?: string;
    type: 'SENDER' | 'RECEIVER';
  }): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }
}
