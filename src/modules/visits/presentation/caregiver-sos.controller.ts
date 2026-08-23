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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { CancelSosUseCase } from '../application/use-cases/cancel-sos.use-case';
import { RaiseSosUseCase } from '../application/use-cases/raise-sos.use-case';
import { RaiseSosRequestDto } from './dto/raise-sos-request.dto';
import { SosResponseDto } from './dto/sos-response.dto';

/**
 * Caregiver SOS: raising an emergency alert from an active shift and cancelling
 * one raised in error. Both require a valid access token and are scoped to the
 * authenticated caregiver, so a caregiver can only raise or cancel alerts on their
 * own visits.
 */
@ApiTags('caregiver-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/visits', version: '1' })
export class CaregiverSosController {
  constructor(
    private readonly raiseSos: RaiseSosUseCase,
    private readonly cancelSos: CancelSosUseCase,
  ) {}

  @Post(':id/sos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Raise an SOS emergency alert from an active shift' })
  @ApiCreatedResponse({ type: SosResponseDto })
  async raise(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RaiseSosRequestDto,
  ): Promise<SosResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.raiseSos.execute({
      caregiverId: principal.userId,
      visitId: id,
      latitude: body.latitude,
      longitude: body.longitude,
    });
    return SosResponseDto.fromResult(result);
  }

  @Post(':id/sos/:alertId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an SOS alert raised in error' })
  @ApiOkResponse({ type: SosResponseDto })
  async cancel(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('alertId', ParseUUIDPipe) alertId: string,
  ): Promise<SosResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.cancelSos.execute({
      caregiverId: principal.userId,
      visitId: id,
      alertId,
    });
    return SosResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can raise or cancel an SOS');
    }
  }
}
