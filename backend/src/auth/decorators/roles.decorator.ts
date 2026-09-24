import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator để gán danh sách roles được phép truy cập vào route.
 * Dùng kết hợp với RolesGuard.
 *
 * @example
 * @Roles('ADMIN', 'PRICING_MANAGER')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('pricing-test')
 * pricingTest() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
