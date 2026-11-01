import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { EvaluateOrderDto } from './dto/evaluate-order.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  /**
   * POST /pricing/evaluate
   * Tính giá đơn hàng theo Pure Function Evaluator
   */
  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluate(@Body() dto: EvaluateOrderDto) {
    return this.pricingService.evaluate(dto);
  }

  /**
   * GET /pricing/bundles/active
   * Lấy gói cấu hình giá đang hoạt động
   */
  @Get('bundles/active')
  async getActiveBundle() {
    return this.pricingService.getActiveBundle();
  }

  /**
   * GET /pricing/bundles
   * Quản lý danh sách Price Bundles (chỉ Pricing Manager & Admin)
   */
  @Get('bundles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PRICING_MANAGER, RoleType.ADMIN)
  async getAllBundles() {
    return this.pricingService.getAllBundles();
  }

  /**
   * GET /pricing/bundles/:id
   * Chi tiết gói giá
   */
  @Get('bundles/:id')
  async getBundleById(@Param('id') id: string) {
    return this.pricingService.getBundleById(id);
  }

  /**
   * POST /pricing/bundles
   * Tạo Price Bundle mới ở trạng thái DRAFT
   */
  @Post('bundles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PRICING_MANAGER, RoleType.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createBundle(@Body() dto: CreateBundleDto, @CurrentUser() user: any) {
    return this.pricingService.createBundle(dto, user?.email ?? 'pricing@laundrochain.vn');
  }

  /**
   * POST /pricing/bundles/:id/publish
   * Xuất bản gói giá (ký số và kích hoạt)
   */
  @Post('bundles/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PRICING_MANAGER, RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async publishBundle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pricingService.publishBundle(id, user?.email ?? 'pricing@laundrochain.vn');
  }

  /**
   * POST /pricing/analyze
   * Chạy phân tích tĩnh WP3 (Kiểm tra Dead Rules & Below-floor/Zero-price bug)
   */
  @Post('analyze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PRICING_MANAGER, RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async analyze(@Query('bundleId') bundleId?: string) {
    return this.pricingService.analyze(bundleId);
  }
}
