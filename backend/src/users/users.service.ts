import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { Role, BayType } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(
    email: string,
    password: string,
    role: Role,
    officeId?: string,
    authorizedBayTypes?: BayType[]
  ) {
    return this.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        roleId: role.id,
        officeId: officeId || null,
        authorizedBayTypes: authorizedBayTypes || [],
      },
      include: { role: true, office: true },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true, office: true },
    });
  }

  async updateAuthorizedBayTypes(userId: string, bayTypes: BayType[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        authorizedBayTypes: bayTypes,
      },
      include: { role: true, office: true },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        officeId: true,
        authorizedBayTypes: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async createBackOfficeUser(dto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    // Validate office if provided
    if (dto.officeId) {
      const office = await this.prisma.office.findUnique({
        where: { id: dto.officeId },
      });

      if (!office) {
        throw new BadRequestException('Invalid office');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        officeId: dto.officeId || null,
        authorizedBayTypes: dto.authorizedBayTypes || [],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        officeId: true,
        authorizedBayTypes: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateBackOfficeUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Validate role if provided
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new BadRequestException('Invalid role');
      }
    }

    // Validate office if provided
    if (dto.officeId) {
      const office = await this.prisma.office.findUnique({
        where: { id: dto.officeId },
      });

      if (!office) {
        throw new BadRequestException('Invalid office');
      }
    }

    const updateData: any = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roleId: dto.roleId,
      officeId: dto.officeId,
      authorizedBayTypes: dto.authorizedBayTypes,
    };

    // Only hash password if it's being changed
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key =>
      updateData[key] === undefined && delete updateData[key]
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        officeId: true,
        authorizedBayTypes: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAllBackOfficeUsers(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roleId: true,
          officeId: true,
          authorizedBayTypes: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          office: {
            select: {
              id: true,
              name: true,
              branchCode: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteBackOfficeUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            scanningSessions: true,
            scans: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has any activity
    if (user._count.scanningSessions > 0 || user._count.scans > 0) {
      throw new BadRequestException(
        'Cannot delete user with existing scanning sessions or scans. Consider deactivating the user instead.'
      );
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  async getAllRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getCashiers(officeId?: string) {
    const where: any = {
      role: {
        name: 'cashier',
      },
    };

    if (officeId) {
      where.officeId = officeId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        officeId: true,
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }
}