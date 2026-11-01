import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ServiceType, MemberTier, TimeSlot } from '../../shared/pricing-engine/types';

export class EvaluateOrderDto {
  @IsEnum(['WASH_DRY', 'DRY_ONLY', 'WASH_ONLY', 'IRON', 'EXPRESS'])
  serviceType: ServiceType;

  @IsEnum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
  memberTier: MemberTier;

  @IsNumber()
  @Min(0.1)
  weightKg: number;

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsEnum(['PEAK', 'OFF_PEAK', 'NORMAL'])
  timeSlot?: TimeSlot;

  @IsOptional()
  @IsString()
  bundleVersion?: string;
}
