import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBayDto } from './dto/create-bay.dto';
import { UpdateBayDto } from './dto/update-bay.dto';

@Injectable()
export class BaysService {
  constructor(private prisma: PrismaService) {}

  async create(createBayDto: CreateBayDto) {
    // Check if office exists
    const office = await this.prisma.office.findUnique({
      where: { id: createBayDto.officeId },
    });
    if (!office) {
      throw new NotFoundException('Office not found');
    }

    // Check if bay type already exists for this office (unique constraint)
    const existingBay = await this.prisma.bay.findUnique({
      where: {
        officeId_bayType: {
          officeId: createBayDto.officeId,
          bayType: createBayDto.bayType as any,
        },
      },
    });

    if (existingBay) {
      throw new BadRequestException(
        `A ${createBayDto.bayType} bay already exists for this office`
      );
    }

    return this.prisma.bay.create({
      data: {
        name: createBayDto.name,
        bayType: createBayDto.bayType as any,
        officeId: createBayDto.officeId,
        active: createBayDto.active ?? true,
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    });
  }

  async findAll(officeId?: string) {
    const where: any = {};
    if (officeId) {
      where.officeId = officeId;
    }

    return this.prisma.bay.findMany({
      where,
      include: {
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
        _count: {
          select: {
            scanningSessions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const bay = await this.prisma.bay.findUnique({
      where: { id },
      include: {
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
        scanningSessions: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                scans: true,
              },
            },
          },
        },
      },
    });

    if (!bay) {
      throw new NotFoundException('Bay not found');
    }

    return bay;
  }

  async update(id: string, updateBayDto: UpdateBayDto) {
    const bay = await this.prisma.bay.findUnique({
      where: { id },
    });

    if (!bay) {
      throw new NotFoundException('Bay not found');
    }

    return this.prisma.bay.update({
      where: { id },
      data: updateBayDto,
      include: {
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const bay = await this.prisma.bay.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            scanningSessions: true,
          },
        },
      },
    });

    if (!bay) {
      throw new NotFoundException('Bay not found');
    }

    if (bay._count.scanningSessions > 0) {
      throw new BadRequestException(
        'Cannot delete bay with existing scanning sessions. Consider deactivating it instead.'
      );
    }

    await this.prisma.bay.delete({
      where: { id },
    });

    return { message: 'Bay deleted successfully' };
  }

  async getActiveSessionsCount(bayId: string) {
    return this.prisma.scanningSession.count({
      where: {
        bayId,
        closedAt: null,
      },
    });
  }

  async canStartNewSession(bayId: string): Promise<boolean> {
    const activeCount = await this.getActiveSessionsCount(bayId);
    return activeCount < 2;
  }
}
