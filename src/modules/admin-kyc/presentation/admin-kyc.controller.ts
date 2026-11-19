import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { ListKycVerificationsUseCase } from '../application/use-cases/list-kyc-verifications.use-case';
import { KycAuditQueryDto } from './dto/kyc-audit-query.dto';
import { KycAuditListResponseDto } from './dto/kyc-audit-response.dto';

/**
 * Admin KYC mismatch audit: a read only review of stored identity verifications and
 * the field level differences the provider flagged. Requires a valid admin token.
 */
@ApiTags('admin-kyc')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/kyc', version: '1' })
export class AdminKycController {
  constructor(private readonly listVerifications: ListKycVerificationsUseCase) {}

  @Get('verifications')
  @ApiOperation({ summary: 'List stored KYC verifications, optionally filtered by status' })
  @ApiOkResponse({ type: KycAuditListResponseDto })
  async list(@Query() query: KycAuditQueryDto): Promise<KycAuditListResponseDto> {
    const result = await this.listVerifications.execute({
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return KycAuditListResponseDto.fromResult(result);
  }
}
