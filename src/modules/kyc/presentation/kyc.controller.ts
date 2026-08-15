import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetKycStatusUseCase } from '../application/use-cases/get-kyc-status.use-case';
import { SubmitKycUseCase } from '../application/use-cases/submit-kyc.use-case';
import { KycStatusResponseDto } from './dto/kyc-status-response.dto';
import { SubmitKycRequestDto } from './dto/submit-kyc-request.dto';

const SENSITIVE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * HTTP entry point for owner identity verification (KYC). JWT protected and
 * scoped to the owner; the market (and therefore the provider) is derived from
 * the access token, never chosen by the client.
 */
@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'kyc', version: '1' })
export class KycController {
  constructor(
    private readonly submitKyc: SubmitKycUseCase,
    private readonly getStatus: GetKycStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Submit identity documents for verification' })
  @ApiCreatedResponse({ type: KycStatusResponseDto })
  async submit(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: SubmitKycRequestDto,
  ): Promise<KycStatusResponseDto> {
    const result = await this.submitKyc.execute({
      ownerId: principal.userId,
      country: principal.country,
      fullName: body.fullName,
      documentType: body.documentType,
      ssnLast4: body.ssnLast4,
      idNumber: body.idNumber,
    });
    return KycStatusResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'Get the owner KYC status' })
  @ApiOkResponse({ type: KycStatusResponseDto })
  async status(@CurrentUser() principal: AuthenticatedPrincipal): Promise<KycStatusResponseDto> {
    const result = await this.getStatus.execute({ ownerId: principal.userId });
    return KycStatusResponseDto.fromResult(result);
  }
}
