import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreviewCareCodeUseCase } from '../application/use-cases/care-circle.use-cases';
import { CareCirclePreviewResponseDto, RedeemCareCodeRequestDto } from './dto/care-circle.dto';

/** Tight limit: this is an unauthenticated lookup, so guessing must be expensive. */
const PREVIEW_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Public care circle route. Unlike the rest of the Profile tab this is NOT behind
 * the access token: a person acting on a care code has not joined yet, so they
 * cannot be authenticated. The preview discloses only the owner's display name and
 * avatar for a confirmation step, returns the same error for any bad code, and is
 * rate limited to blunt enumeration and abuse. A person with no account signs up
 * the normal way, then redeems the code once logged in.
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
