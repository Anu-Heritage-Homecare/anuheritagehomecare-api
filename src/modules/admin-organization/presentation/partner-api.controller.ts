import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyPrincipal } from '../application/use-cases/authenticate-api-key.use-case';
import { ApiKeyAuthGuard, CurrentApiKey } from './api-key-auth.guard';

/** The identity of the API key authenticating the request. */
class PartnerIdentityResponseDto {
  @ApiProperty() apiKeyId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String] }) scopes!: string[];
}

/**
 * The external partner API, authenticated by an organization API key rather than
 * an admin or mobile token. Every call here authenticates through ApiKeyAuthGuard,
 * which records it against the key's live usage. `GET /partner/me` is the key's
 * whoami; real partner resource routes add `@RequiresApiScope(...)` as they land.
 */
@ApiTags('partner')
@ApiSecurity('api-key')
@UseGuards(ApiKeyAuthGuard)
@Controller({ path: 'partner', version: '1' })
export class PartnerApiController {
  @Get('me')
  @ApiOperation({ summary: 'The authenticated API key identity (whoami)' })
  @ApiOkResponse({ type: PartnerIdentityResponseDto })
  me(@CurrentApiKey() principal: ApiKeyPrincipal): PartnerIdentityResponseDto {
    return principal;
  }
}
