import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { GetCareOperationsUseCase } from '../application/use-cases/get-care-operations.use-case';
import {
  AddServiceOfferingUseCase,
  DeleteServiceOfferingUseCase,
  UpdateServiceOfferingUseCase,
} from '../application/use-cases/service-offering.use-cases';
import { UpdateGuardrailsUseCase } from '../application/use-cases/update-guardrails.use-case';
import {
  AddVisitFormatUseCase,
  DeleteVisitFormatUseCase,
  UpdateVisitFormatUseCase,
} from '../application/use-cases/visit-format.use-cases';
import {
  AddServiceRequestDto,
  AddVisitFormatRequestDto,
  UpdateGuardrailsRequestDto,
  UpdateServiceRequestDto,
  UpdateVisitFormatRequestDto,
} from './dto/care-operations-request.dto';
import { CareOperationsResponseDto } from './dto/care-operations-response.dto';

/**
 * Settings > Care Operations. One aggregated read of the whole screen plus the
 * service offerings, visit formats and scheduling guardrails edits. The Standard
 * Task Checklists are the existing task templates, surfaced read only here. Every
 * route requires a valid admin token.
 */
@ApiTags('admin-care-operations')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/care-operations', version: '1' })
export class CareOperationsController {
  constructor(
    private readonly getScreen: GetCareOperationsUseCase,
    private readonly addService: AddServiceOfferingUseCase,
    private readonly updateService: UpdateServiceOfferingUseCase,
    private readonly deleteService: DeleteServiceOfferingUseCase,
    private readonly addFormat: AddVisitFormatUseCase,
    private readonly updateFormat: UpdateVisitFormatUseCase,
    private readonly deleteFormat: DeleteVisitFormatUseCase,
    private readonly updateGuardrails: UpdateGuardrailsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The whole Care Operations settings screen in one read' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async read(): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(await this.getScreen.execute());
  }

  @Post('services')
  @ApiOperation({ summary: 'Add a service offering (the Add Service action)' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async createService(@Body() body: AddServiceRequestDto): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(await this.addService.execute(body));
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Edit a service offering, including the enable/disable toggle' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async editService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateServiceRequestDto,
  ): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(
      await this.updateService.execute({ offeringId: id, ...body }),
    );
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Remove a service offering' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async removeService(@Param('id', ParseUUIDPipe) id: string): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(await this.deleteService.execute(id));
  }

  @Post('visit-formats')
  @ApiOperation({ summary: 'Add a visit format with its rates (the Add Format action)' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async createFormat(@Body() body: AddVisitFormatRequestDto): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(
      await this.addFormat.execute({
        name: body.name,
        description: body.description,
        durationMinutes: body.durationMinutes,
        rateUnit: body.rateUnit,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
        rates: body.rates,
      }),
    );
  }

  @Patch('visit-formats/:id')
  @ApiOperation({ summary: 'Edit a visit format and/or its rates' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async editFormat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateVisitFormatRequestDto,
  ): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(
      await this.updateFormat.execute({
        formatId: id,
        name: body.name,
        description: body.description,
        durationMinutes: body.durationMinutes,
        rateUnit: body.rateUnit,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
        rates: body.rates,
      }),
    );
  }

  @Delete('visit-formats/:id')
  @ApiOperation({ summary: 'Remove a visit format' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async removeFormat(@Param('id', ParseUUIDPipe) id: string): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(await this.deleteFormat.execute(id));
  }

  @Patch('guardrails')
  @ApiOperation({ summary: 'Revise the scheduling guardrails (the per row Edit actions)' })
  @ApiOkResponse({ type: CareOperationsResponseDto })
  async editGuardrails(
    @Body() body: UpdateGuardrailsRequestDto,
  ): Promise<CareOperationsResponseDto> {
    return CareOperationsResponseDto.fromResult(await this.updateGuardrails.execute(body));
  }
}
