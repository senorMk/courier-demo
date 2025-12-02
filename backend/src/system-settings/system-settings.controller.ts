import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { SystemSettingsService } from './system-settings.service';

const ADMIN_ROLES = [
  'managing-director',
  'operations-officer',
] as const;

@Controller('api/v1/system-settings')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SetMetadata('roles', ADMIN_ROLES)
  async getAllSettings() {
    try {
      const uncollectedThreshold = await this.settingsService.getUncollectedThresholdDays();

      return {
        uncollectedThresholdDays: uncollectedThreshold,
      };
    } catch (e) {
      console.error('SystemSettingsController.getAllSettings error:', e);
      throw e;
    }
  }

  @Get('uncollected-threshold')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SetMetadata('roles', ADMIN_ROLES)
  async getUncollectedThreshold() {
    try {
      const days = await this.settingsService.getUncollectedThresholdDays();
      return {
        uncollectedThresholdDays: days,
      };
    } catch (e) {
      console.error('SystemSettingsController.getUncollectedThreshold error:', e);
      throw e;
    }
  }

  @Put('uncollected-threshold')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SetMetadata('roles', ADMIN_ROLES)
  async updateUncollectedThreshold(
    @Body() body: { days: number }
  ) {
    try {
      const { days } = body;

      if (!days || !Number.isInteger(days) || days < 1) {
        throw new BadRequestException('Days must be a positive integer');
      }

      if (days > 365) {
        throw new BadRequestException('Days cannot exceed 365');
      }

      await this.settingsService.updateUncollectedThresholdDays(days);

      return {
        success: true,
        message: `Uncollected threshold updated to ${days} days`,
        uncollectedThresholdDays: days,
      };
    } catch (e) {
      console.error('SystemSettingsController.updateUncollectedThreshold error:', e);
      throw e;
    }
  }

  @Get('key/:key')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SetMetadata('roles', ADMIN_ROLES)
  async getSettingByKey(@Param('key') key: string) {
    try {
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }

      const value = await this.settingsService.getSetting(key.trim());

      if (value === null) {
        throw new NotFoundException(`Setting '${key}' not found`);
      }

      return {
        key,
        value,
      };
    } catch (e) {
      console.error('SystemSettingsController.getSettingByKey error:', e);
      throw e;
    }
  }

  @Put('key/:key')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @SetMetadata('roles', ADMIN_ROLES)
  async updateSettingByKey(
    @Param('key') key: string,
    @Body() body: { value: string; description?: string }
  ) {
    try {
      if (!key || !key.trim()) {
        throw new BadRequestException('Setting key is required');
      }

      if (!body.value && body.value !== '') {
        throw new BadRequestException('Setting value is required');
      }

      await this.settingsService.setSetting(
        key.trim(),
        String(body.value),
        body.description
      );

      return {
        success: true,
        message: `Setting '${key}' updated successfully`,
        key,
        value: body.value,
      };
    } catch (e) {
      console.error('SystemSettingsController.updateSettingByKey error:', e);
      throw e;
    }
  }
}
