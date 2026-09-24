import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import { RoleType } from '@prisma/client';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Đăng ký tài khoản mới, mặc định gán role MEMBER
   */
  async register(dto: RegisterDto) {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Kiểm tra số điện thoại nếu có
    if (dto.phoneNumber) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existingPhone) {
        throw new ConflictException('Số điện thoại đã được sử dụng');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Tìm role MEMBER
    const memberRole = await this.prisma.role.findUnique({
      where: { name: RoleType.MEMBER },
    });

    if (!memberRole) {
      throw new NotFoundException('Không tìm thấy Role MEMBER. Vui lòng chạy seed trước.');
    }

    // Tạo user và gán role MEMBER
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        userRoles: {
          create: { roleId: memberRole.id },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);

    return {
      message: 'Đăng ký thành công',
      user: this.sanitizeUser(user, roles),
    };
  }

  /**
   * Đăng nhập, trả về JWT accessToken
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const roles = user.userRoles.map((ur) => ur.role.name as string);

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: this.sanitizeUser(user, roles),
    };
  }

  /**
   * Lấy thông tin user hiện tại từ userId (JWT sub)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const roles = user.userRoles.map((ur) => ur.role.name as string);
    return this.sanitizeUser(user, roles);
  }

  /**
   * Cập nhật thông tin profile
   */
  async updateMe(userId: string, dto: UpdateProfileDto) {
    // Kiểm tra SĐT nếu có thay đổi
    if (dto.phoneNumber) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new ConflictException('Số điện thoại đã được sử dụng bởi tài khoản khác');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name as string);

    return {
      message: 'Cập nhật thành công',
      user: this.sanitizeUser(user, roles),
    };
  }

  /**
   * Loại bỏ thông tin nhạy cảm (passwordHash) trước khi trả về client
   */
  private sanitizeUser(user: any, roles: string[]) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
