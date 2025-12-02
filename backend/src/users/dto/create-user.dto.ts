import { IsEmail, IsString, MinLength, IsOptional, IsArray, IsEnum } from 'class-validator';
import { BayType } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(BayType, { each: true })
  authorizedBayTypes?: BayType[];
}
