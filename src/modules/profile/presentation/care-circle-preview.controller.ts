import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  PreviewCareCodeUseCase,
  RegisterAndLinkUseCase,
} from '../application/use-cases/care-circle.use-cases';
import {
  CareCirclePreviewResponseDto,
  RedeemCareCodeRequestDto,
  RegisterAndLinkRequestDto,
  RegisterAndLinkResponseDto,
} from './dto/care-circle.dto';

/** Tight limit: this is an unauthenticated lookup, so guessing must be expensive. */
const PREVIEW_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
/** Account creation is heavier and irreversible; keep its public limit tight too. */
const REGISTER_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Public care circle routes. Unlike the rest of the Profile tab these are NOT
 * behind the access token: a person acting on a care code has not joined yet, so
 * they cannot be authenticated. The preview discloses only the owner's display
 * name and avatar for a confirmation step; register and link creates a brand new
 * member account and joins the circle for someone with no account. Both return
 * the same error for any bad code and are rate limited to blunt enumeration and
 * abuse.
 */
@ApiTags('profile')
@Controller({ path: 'profile/care-circle', version: '1' })
export class CareCirclePreviewController {
  constructor(
    private readonly preview: PreviewCareCodeUseCase,
    private readonly registerAndLink: RegisterAndLinkUseCase,
  ) {}

  @Post('preview')
  @Throttle(PREVIEW_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview whose care circle a code belongs to, before joining' })
  @ApiOkResponse({ type: CareCirclePreviewResponseDto })
  async previewCode(@Body() body: RedeemCareCodeRequestDto): Promise<CareCirclePreviewResponseDto> {
    const result = await this.preview.execute({ code: body.code });
    return CareCirclePreviewResponseDto.fromResult(result);
  }

  @Post('register-and-link')
  @Throttle(REGISTER_THROTTLE)
  @ApiOperation({
    summary: 'Register a new member account and join a care code circle in one step',
  })
  @ApiCreatedResponse({ type: RegisterAndLinkResponseDto })
  @ApiConflictResponse({
    description: 'ACCOUNT_EXISTS: the email already has an account; switch to login and link',
  })
  async register(@Body() body: RegisterAndLinkRequestDto): Promise<RegisterAndLinkResponseDto> {
    const result = await this.registerAndLink.execute({
      code: body.code,
      relationship: body.relationship,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
      password: body.password,
    });
    return RegisterAndLinkResponseDto.fromResult(result);
  }
}
