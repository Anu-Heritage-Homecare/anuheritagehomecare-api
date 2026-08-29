import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { SubmitAdditionalCareRequestUseCase } from '../application/use-cases/submit-additional-care-request.use-case';
import { CareRequestResponseDto } from './dto/care-request-response.dto';
import { SubmitCareRequestDto } from './dto/submit-care-request.dto';

/**
 * Family owner requests for additional care. Requires a valid access token and is
 * scoped to the owner, who can only request care for a recipient they own.
 */
@ApiTags('family-care')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'family/care-recipients', version: '1' })
export class CareRequestsController {
  constructor(private readonly submitRequest: SubmitAdditionalCareRequestUseCase) {}

  @Post(':id/care-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request additional care for a care recipient' })
  @ApiCreatedResponse({ type: CareRequestResponseDto })
  async request(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitCareRequestDto,
  ): Promise<CareRequestResponseDto> {
    const result = await this.submitRequest.execute({
      ownerId: principal.userId,
      careRecipientId: id,
      careType: body.careType,
      requestedDate: new Date(body.requestedDate),
      startMinute: body.startMinute,
      durationMinutes: body.durationMinutes,
      reason: body.reason,
    });
    return CareRequestResponseDto.fromResult(result);
  }
}
