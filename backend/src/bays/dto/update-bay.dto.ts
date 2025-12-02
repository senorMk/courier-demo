import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateBayDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
