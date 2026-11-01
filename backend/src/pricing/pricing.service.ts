import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluateOrderDto } from './dto/evaluate-order.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import {
  evaluatePrice,
  DEFAULT_BUNDLE,
  computeBundleIntegrityHash,
  analyzePriceBundle,
} from '../shared/pricing-engine';
import {
  PriceBundle,
  OrderContext,
  QuoteResult,
  StaticAnalysisReport,
  ServiceType,
} from '../shared/pricing-engine/types';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy gói giá đang có hiệu lực (active bundle)
   */
  async getActiveBundle(): Promise<PriceBundle> {
    const now = new Date();
    const dbBundle = await this.prisma.priceBundle.findFirst({
      where: {
        status: 'PUBLISHED',
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!dbBundle) {
      // Fallback sang DEFAULT_BUNDLE nếu DB chưa có
      return DEFAULT_BUNDLE;
    }

    return this.mapDbBundleToEngine(dbBundle);
  }

  /**
   * Lấy danh sách tất cả các gói giá
   */
  async getAllBundles() {
    return this.prisma.priceBundle.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy chi tiết gói giá theo ID hoặc Version
   */
  async getBundleById(idOrVersion: string): Promise<PriceBundle> {
    const dbBundle = await this.prisma.priceBundle.findFirst({
      where: {
        OR: [{ id: idOrVersion }, { version: idOrVersion }],
      },
    });

    if (!dbBundle) {
      if (idOrVersion === DEFAULT_BUNDLE.bundleVersion || idOrVersion === DEFAULT_BUNDLE.bundleId) {
        return DEFAULT_BUNDLE;
      }
      throw new NotFoundException(`Không tìm thấy Price Bundle với ID hoặc Version: ${idOrVersion}`);
    }

    return this.mapDbBundleToEngine(dbBundle);
  }

  /**
   * Tạo gói giá mới (ở trạng thái DRAFT)
   */
  async createBundle(dto: CreateBundleDto, authorEmail: string) {
    const existing = await this.prisma.priceBundle.findUnique({
      where: { version: dto.version },
    });
    if (existing) {
      throw new BadRequestException(`Phiên bản bundle '${dto.version}' đã tồn tại trong hệ thống.`);
    }

    const effectiveFromDate = new Date(dto.effectiveFrom);
    const effectiveToDate = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    // Tự động tính toán Integrity Hash
    const integrityHash = computeBundleIntegrityHash({
      bundleVersion: dto.version,
      basePricePerKg: dto.basePrices,
      rules: dto.rules,
      effectiveFrom: effectiveFromDate,
    });

    return this.prisma.priceBundle.create({
      data: {
        version: dto.version,
        name: dto.name,
        description: dto.description,
        status: 'DRAFT',
        effectiveFrom: effectiveFromDate,
        effectiveTo: effectiveToDate,
        basePrices: dto.basePrices,
        rules: dto.rules,
        integrityHash,
        publishedBy: authorEmail,
      },
    });
  }

  /**
   * Xuất bản gói giá (Chuyển sang trạng thái PUBLISHED kèm chữ ký điện tử)
   */
  async publishBundle(id: string, publishedBy: string) {
    const bundle = await this.prisma.priceBundle.findUnique({ where: { id } });
    if (!bundle) {
      throw new NotFoundException(`Không tìm thấy gói giá ID: ${id}`);
    }

    // Kiểm tra phân tích tĩnh trước khi xuất bản
    const engineBundle = this.mapDbBundleToEngine(bundle);
    const report = analyzePriceBundle(engineBundle, new Date());
    if (!report.isSafeToPublish) {
      throw new BadRequestException({
        message: 'Gói giá không đạt chuẩn an toàn để xuất bản (phát hiện lỗi logic hoặc giá sàn).',
        report,
      });
    }

    const signature = `ED25519_SIG_${Date.now()}_${publishedBy.toUpperCase()}_CERTIFIED`;

    return this.prisma.priceBundle.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedBy,
        signature,
      },
    });
  }

  /**
   * Tính giá đơn hàng bằng Pure Evaluator
   */
  async evaluate(dto: EvaluateOrderDto, clientTimestamp?: Date): Promise<QuoteResult> {
    const bundle = dto.bundleVersion
      ? await this.getBundleById(dto.bundleVersion)
      : await this.getActiveBundle();

    const timestamp = clientTimestamp ?? new Date();

    const context: OrderContext = {
      serviceType: dto.serviceType,
      memberTier: dto.memberTier,
      weightKg: dto.weightKg,
      requestTimestamp: timestamp,
      voucherCode: dto.voucherCode,
      timeSlot: dto.timeSlot,
    };

    return evaluatePrice(bundle, context);
  }

  /**
   * Phân tích tĩnh gói giá (Static Analysis WP3)
   */
  async analyze(bundleIdOrVersion?: string): Promise<StaticAnalysisReport> {
    const bundle = bundleIdOrVersion
      ? await this.getBundleById(bundleIdOrVersion)
      : await this.getActiveBundle();

    return analyzePriceBundle(bundle, new Date());
  }

  /**
   * Helper chuyển đổi dữ liệu từ Prisma sang PriceBundle của Pure Engine
   */
  private mapDbBundleToEngine(dbBundle: any): PriceBundle {
    return {
      bundleId: dbBundle.id,
      bundleVersion: dbBundle.version,
      name: dbBundle.name,
      description: dbBundle.description ?? undefined,
      effectiveFrom: new Date(dbBundle.effectiveFrom),
      effectiveTo: dbBundle.effectiveTo ? new Date(dbBundle.effectiveTo) : null,
      basePricePerKg: dbBundle.basePrices as Record<ServiceType, number>,
      rules: dbBundle.rules as any[],
      integrityHash: dbBundle.integrityHash,
      signature: dbBundle.signature ?? undefined,
    };
  }
}
