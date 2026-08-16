import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { IngestLocationsUseCase } from '../application/use-cases/ingest-locations.use-case';
import { IngestLocationsRequestDto } from './dto/ingest-locations-request.dto';
import { IngestedLocationsResponseDto } from './dto/ingested-locations-response.dto';

/**
 * Location telemetry ingestion. A caregiver's device uploads batches of
 * breadcrumbs here (frequently during navigation, occasionally in the
 * background). Requires a valid access token and only ever records points for
 * the authenticated caregiver, never for a caregiver named in the body.
 */
@ApiTags('tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/locations', version: '1' })
export class LocationTrackingController {
  constructor(private readonly ingestLocations: IngestLocationsUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload a batch of caregiver location breadcrumbs' })
  @ApiOkResponse({ type: IngestedLocationsResponseDto })
  async ingest(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: IngestLocationsRequestDto,
  ): Promise<IngestedLocationsResponseDto> {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can report location');
    }

    const result = await this.ingestLocations.execute({
      caregiverId: principal.userId,
      points: body.points,
    });
    return IngestedLocationsResponseDto.fromResult(result);
  }
}
