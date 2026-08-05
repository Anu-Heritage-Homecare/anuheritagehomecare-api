import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetClientByIdUseCase } from '../application/use-cases/get-client-by-id.use-case';
import { RegisterClientUseCase } from '../application/use-cases/register-client.use-case';
import { ClientResponseDto } from './dto/client-response.dto';
import { RegisterClientRequestDto } from './dto/register-client-request.dto';

/**
 * HTTP entry point for the Clients bounded context. Controllers stay thin: they
 * translate HTTP into application commands/queries and back into DTOs. No
 * business logic lives here.
 */
@ApiTags('clients')
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(
    private readonly registerClient: RegisterClientUseCase,
    private readonly getClientById: GetClientByIdUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new client' })
  @ApiCreatedResponse({ type: ClientResponseDto })
  async register(@Body() body: RegisterClientRequestDto): Promise<ClientResponseDto> {
    const result = await this.registerClient.execute(body);
    return ClientResponseDto.fromResult(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a client by id' })
  @ApiOkResponse({ type: ClientResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ClientResponseDto> {
    const result = await this.getClientById.execute(id);
    return ClientResponseDto.fromResult(result);
  }
}
