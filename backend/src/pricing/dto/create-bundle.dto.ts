import { IsArray, IsDateString, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBundleDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsObject()
  basePrices: Record<string, number>;

  @IsArray()
  rules: any[];
}
