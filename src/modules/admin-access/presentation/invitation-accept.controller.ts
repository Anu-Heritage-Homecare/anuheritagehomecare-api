import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AcceptInvitationUseCase } from '../application/use-cases/accept-invitation.use-case';
import { AcceptInvitationRequestDto } from './dto/admin-access-request.dto';
import { AcceptInvitationResponseDto } from './dto/admin-access-response.dto';

/**
 * Public acceptance of a back office invitation. Deliberately unguarded: the
 * invitee is not yet an admin and authenticates by proving the one time token.
 * Success provisions their account; they then log in through the normal admin
 * auth flow.
 */
@ApiTags('admin-access')
@Controller({ path: 'admin/invitations', version: '1' })
export class InvitationAcceptController {
  constructor(private readonly acceptInvitation: AcceptInvitationUseCase) {}

  @Post('accept')
  @ApiOperation({ summary: 'Accept an invitation and set a password (public)' })
  @ApiOkResponse({ type: AcceptInvitationResponseDto })
  async accept(@Body() body: AcceptInvitationRequestDto): Promise<AcceptInvitationResponseDto> {
    const result = await this.acceptInvitation.execute({
      token: body.token,
      password: body.password,
    });
    return AcceptInvitationResponseDto.fromResult(result);
  }
}
