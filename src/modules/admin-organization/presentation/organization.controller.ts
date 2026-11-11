import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { OrganizationResult } from '../application/dto/organization.result';
import {
  AddBranchUseCase,
  DeleteBranchUseCase,
  UpdateBranchUseCase,
} from '../application/use-cases/branch.use-cases';
import {
  AddEmergencyContactUseCase,
  DeleteEmergencyContactUseCase,
  UpdateEmergencyContactUseCase,
} from '../application/use-cases/emergency-contact.use-cases';
import { GetOrganizationUseCase } from '../application/use-cases/get-organization.use-case';
import { SetBusinessHoursUseCase } from '../application/use-cases/set-business-hours.use-case';
import { UpdateOrganizationProfileUseCase } from '../application/use-cases/update-organization-profile.use-case';
import { buildOrganizationSystemsPdf } from '../infrastructure/export/organization-pdf';
import {
  AddBranchRequestDto,
  AddEmergencyContactRequestDto,
  SetBusinessHoursRequestDto,
  UpdateBranchRequestDto,
  UpdateEmergencyContactRequestDto,
  UpdateOrganizationProfileRequestDto,
} from './dto/organization-request.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';

/**
 * Settings > Organization Profile. One aggregated read of the whole screen, the
 * profile and schedule edits, the branch and emergency contact management, and the
 * Export Systems PDF. Every route requires a valid admin token. There is a single
 * organization, so no id is taken for its own reads and writes.
 */
@ApiTags('admin-organization')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/organization', version: '1' })
export class OrganizationController {
  constructor(
    private readonly getOrganization: GetOrganizationUseCase,
    private readonly updateProfile: UpdateOrganizationProfileUseCase,
    private readonly setBusinessHours: SetBusinessHoursUseCase,
    private readonly addBranch: AddBranchUseCase,
    private readonly updateBranch: UpdateBranchUseCase,
    private readonly deleteBranch: DeleteBranchUseCase,
    private readonly addContact: AddEmergencyContactUseCase,
    private readonly updateContact: UpdateEmergencyContactUseCase,
    private readonly deleteContact: DeleteEmergencyContactUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The whole Organization Profile settings screen in one read' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async read(): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(await this.getOrganization.execute());
  }

  @Patch()
  @ApiOperation({ summary: 'Revise the organization profile (the Edit Profile action)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async edit(@Body() body: UpdateOrganizationProfileRequestDto): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(await this.updateProfile.execute(body));
  }

  @Put('business-hours')
  @ApiOperation({ summary: 'Replace the weekly opening schedule (the Edit Schedule action)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async schedule(@Body() body: SetBusinessHoursRequestDto): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(
      await this.setBusinessHours.execute({ days: body.days }),
    );
  }

  @Post('branches')
  @ApiOperation({ summary: 'Add a branch (the Add Branch action)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async createBranch(@Body() body: AddBranchRequestDto): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(await this.addBranch.execute(body));
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Revise a branch' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async editBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBranchRequestDto,
  ): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(
      await this.updateBranch.execute({ branchId: id, ...body }),
    );
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Remove a branch' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async removeBranch(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(await this.deleteBranch.execute(id));
  }

  @Post('emergency-contacts')
  @ApiOperation({ summary: 'Add an emergency contact (the Add action)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async createContact(
    @Body() body: AddEmergencyContactRequestDto,
  ): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(await this.addContact.execute(body));
  }

  @Patch('emergency-contacts/:id')
  @ApiOperation({ summary: 'Revise an emergency contact' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async editContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateEmergencyContactRequestDto,
  ): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(
      await this.updateContact.execute({ contactId: id, ...body }),
    );
  }

  @Delete('emergency-contacts/:id')
  @ApiOperation({ summary: 'Remove an emergency contact' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async removeContact(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return OrganizationResponseDto.fromResult(await this.deleteContact.execute(id));
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export the whole Organization Profile as a PDF (Export Systems PDF)' })
  @ApiProduces('application/pdf')
  async exportPdf(): Promise<StreamableFile> {
    const result: OrganizationResult = await this.getOrganization.execute();
    const { filename, pdf } = buildOrganizationSystemsPdf(result);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
