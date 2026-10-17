import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreviewCareCodeUseCase } from '../application/use-cases/care-circle.use-cases';
import { CareCirclePreviewResponseDto, RedeemCareCodeRequestDto } from './dto/care-circle.dto';

/** Tight limit: this is an unauthenticated lookup, so guessing must be expensive. */
const PREVIEW_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Public care circle preview. Unlike the rest of the Profile tab this route is NOT
 * behind the access token: a person redeeming a care code has not joined yet, so
 * they cannot be authenticated. It discloses only the owner's display name and
 * avatar for a confirmation step, returns the same error for any bad code, and is
 * rate limited to blunt enumeration.
 */
@ApiTags('profile')
@Controller({ path: 'profile/care-circle', version: '1' })
export class CareCirclePreviewController {
  constructor(private readonly preview: PreviewCareCodeUseCase) {}

  @Post('preview')
  @Throttle(PREVIEW_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview whose care circle a code belongs to, before joining' })
  @ApiOkResponse({ type: CareCirclePreviewResponseDto })
  async previewCode(@Body() body: RedeemCareCodeRequestDto): Promise<CareCirclePreviewResponseDto> {
    const result = await this.preview.execute({ code: body.code });
    return CareCirclePreviewResponseDto.fromResult(result);
  }
}
