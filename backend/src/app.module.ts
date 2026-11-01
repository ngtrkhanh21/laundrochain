import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [PrismaModule, AuthModule, PricingModule],
})
export class AppModule {}

