import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum BayType {
  SENDING = 'SENDING',
  RECEIVING = 'RECEIVING',
  DISPATCH = 'DISPATCH',
}

export class CreateBayDto {
  @IsString()
  name: string;

  @IsEnum(BayType)
  bayType: BayType;

  @IsString()
  officeId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
