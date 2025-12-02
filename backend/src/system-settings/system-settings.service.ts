import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the uncollected threshold days setting
   * Default: 7 days
   */
  async getUncollectedThresholdDays(): Promise<number> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: 'uncollected_threshold_days' },
    });

    if (!setting) {
      // Create default if not exists
      await this.prisma.systemSettings.create({
        data: {
          key: 'uncollected_threshold_days',
          value: '7',
          description: 'Number of days after which an uncollected parcel is considered overdue',
        },
      });
      return 7;
    }

    return parseInt(setting.value, 10) || 7;
  }

  /**
   * Update the uncollected threshold days setting
   */
  async updateUncollectedThresholdDays(days: number): Promise<void> {
    await this.prisma.systemSettings.upsert({
      where: { key: 'uncollected_threshold_days' },
      create: {
        key: 'uncollected_threshold_days',
        value: String(days),
        description: 'Number of days after which an uncollected parcel is considered overdue',
      },
      update: {
        value: String(days),
      },
    });
  }

  /**
   * Get a setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  /**
   * Set a setting by key
   */
  async setSetting(key: string, value: string, description?: string): Promise<void> {
    await this.prisma.systemSettings.upsert({
      where: { key },
      create: { key, value, description },
      update: { value, description },
    });
  }
}
