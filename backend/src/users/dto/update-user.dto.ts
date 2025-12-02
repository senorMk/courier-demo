import { IsString, IsOptional, IsArray, IsEnum, MinLength, IsEmail } from 'class-validator';
import { BayType } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(BayType, { each: true })
  authorizedBayTypes?: BayType[];
}
