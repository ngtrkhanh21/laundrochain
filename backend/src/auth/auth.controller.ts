import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Đăng ký tài khoản mới (mặc định gán role MEMBER)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Đăng nhập, trả về JWT accessToken + thông tin user kèm roles
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me
   * Lấy thông tin user hiện tại (yêu cầu đăng nhập)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  /**
   * PUT /auth/me
   * Cập nhật fullName và phoneNumber (yêu cầu đăng nhập)
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateMe(user.userId, dto);
  }

  /**
   * GET /auth/pricing-test
   * API test kiểm tra phân quyền — chỉ ADMIN và PRICING_MANAGER truy cập được
   */
  @Get('pricing-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'PRICING_MANAGER')
  async pricingTest(@CurrentUser() user: { email: string; roles: string[] }) {
    return {
      message: '✅ Bạn có quyền truy cập Pricing Engine',
      user: user.email,
      roles: user.roles,
      timestamp: new Date().toISOString(),
    };
  }
}
