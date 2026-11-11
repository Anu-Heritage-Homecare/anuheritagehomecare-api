import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import {
  CreateApiKeyUseCase,
  GetApiKeyUseCase,
  ListApiKeysUseCase,
  RegenerateApiKeyUseCase,
  RevokeApiKeyUseCase,
} from '../application/use-cases/api-key.use-cases';
import { CreateApiKeyRequestDto } from './dto/api-key-request.dto';
import { ApiKeyCreatedResponseDto, ApiKeyResponseDto } from './dto/api-key-response.dto';

/**
 * Settings > Organization > API Keys. Admin only management of the programmatic
 * keys that partner and external integrations use. A created or regenerated key
 * returns its secret exactly once; thereafter only the masked value is ever shown.
 */
@ApiTags('admin-organization')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/organization/api-keys', version: '1' })
export class ApiKeyController {
  constructor(
    private readonly createKey: CreateApiKeyUseCase,
    private readonly listKeys: ListApiKeysUseCase,
    private readonly getKey: GetApiKeyUseCase,
    private readonly regenerateKey: RegenerateApiKeyUseCase,
    private readonly revokeKey: RevokeApiKeyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the organization API keys' })
  @ApiOkResponse({ type: [ApiKeyResponseDto] })
  async list(): Promise<ApiKeyResponseDto[]> {
    const keys = await this.listKeys.execute();
    return keys.map((key) => ApiKeyResponseDto.fromResult(key));
  }

  @Post()
  @ApiOperation({ summary: 'Issue a new API key (returns the secret once)' })
  @ApiOkResponse({ type: ApiKeyCreatedResponseDto })
  async create(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: CreateApiKeyRequestDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return ApiKeyCreatedResponseDto.fromResult(
      await this.createKey.execute({ ...body, createdById: admin.adminUserId }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'The API Key Details drawer' })
  @ApiOkResponse({ type: ApiKeyResponseDto })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<ApiKeyResponseDto> {
    return ApiKeyResponseDto.fromResult(await this.getKey.execute(id));
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Rotate the key secret (the Regenerate Key action)' })
  @ApiOkResponse({ type: ApiKeyCreatedResponseDto })
  async regenerate(@Param('id', ParseUUIDPipe) id: string): Promise<ApiKeyCreatedResponseDto> {
    return ApiKeyCreatedResponseDto.fromResult(await this.regenerateKey.execute(id));
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Permanently revoke the key (the Revoke Key action)' })
  @ApiOkResponse({ type: ApiKeyResponseDto })
  async revoke(@Param('id', ParseUUIDPipe) id: string): Promise<ApiKeyResponseDto> {
    return ApiKeyResponseDto.fromResult(await this.revokeKey.execute(id));
  }
}
