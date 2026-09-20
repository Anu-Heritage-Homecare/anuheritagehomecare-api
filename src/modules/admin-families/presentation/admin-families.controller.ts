import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FamilyMemberStatus } from '@modules/family-directory/domain/family-member-status.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import {
  AddFamilyUseCase,
  ImportFamiliesUseCase,
} from '../application/use-cases/add-family.use-case';
import {
  BulkEditFamiliesUseCase,
  BulkEditFamiliesResult,
} from '../application/use-cases/bulk-edit-families.use-case';
import { EditFamilyUseCase } from '../application/use-cases/edit-family.use-case';
import { GetFamiliesKpisUseCase } from '../application/use-cases/get-families-kpis.use-case';
import { GetFamilyDetailUseCase } from '../application/use-cases/get-family-detail.use-case';
import { ListFamiliesUseCase } from '../application/use-cases/list-families.use-case';
import {
  FamilyDetailResponseDto,
  FamilyKpisResponseDto,
  FamilyListResponseDto,
} from './dto/family-directory-response.dto';
import { FamiliesQueryDto } from './dto/families-query.dto';
import {
  BulkEditFamiliesRequestDto,
  FamilyContactDto,
  FamilyEmergencyVerifiedRequestDto,
  FamilyNotesRequestDto,
  FamilyPrimaryRecipientRequestDto,
  FamilyStatusRequestDto,
  ImportFamiliesRequestDto,
} from './dto/family-write.dto';

/** Convert a persistence status string into the domain family member status. */
function toDomainStatus(status: string): FamilyMemberStatus {
  const match = Object.values(FamilyMemberStatus).find((value) => String(value) === status);
  return match ?? FamilyMemberStatus.Active;
}

/**
 * Admin Families directory: the family member accounts, their linked care recipients
 * and billing status. Requires a valid admin token. Controllers stay thin.
 */
@ApiTags('admin-families')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/families', version: '1' })
export class AdminFamiliesController {
  constructor(
    private readonly listFamilies: ListFamiliesUseCase,
    private readonly getKpis: GetFamiliesKpisUseCase,
    private readonly getDetail: GetFamilyDetailUseCase,
    private readonly addFamily: AddFamilyUseCase,
    private readonly importFamilies: ImportFamiliesUseCase,
    private readonly editFamily: EditFamilyUseCase,
    private readonly bulkEditFamilies: BulkEditFamiliesUseCase,
  ) {}

  @Get('kpis')
  @ApiOperation({ summary: 'The Families KPI bar' })
  @ApiOkResponse({ type: FamilyKpisResponseDto })
  async kpis(): Promise<FamilyKpisResponseDto> {
    const result = await this.getKpis.execute();
    return FamilyKpisResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'The family directory table, optionally filtered by status' })
  @ApiOkResponse({ type: FamilyListResponseDto })
  async list(@Query() query: FamiliesQueryDto): Promise<FamilyListResponseDto> {
    const result = await this.listFamilies.execute({
      status: query.status ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return FamilyListResponseDto.fromResult(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'The Quick Preview drawer detail for one family member' })
  @ApiOkResponse({ type: FamilyDetailResponseDto })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<FamilyDetailResponseDto> {
    const result = await this.getDetail.execute(id);
    return FamilyDetailResponseDto.fromResult(result);
  }

  @Post()
  @ApiOperation({ summary: 'Add a family member (captured as a contact entry)' })
  @ApiOkResponse()
  async add(@Body() body: FamilyContactDto): Promise<{ id: string }> {
    return this.addFamily.execute({
      fullName: body.fullName,
      phone: body.phone ?? null,
      email: body.email ?? null,
      relationship: body.relationship ?? null,
      primaryRecipientId: body.primaryRecipientId ?? null,
    });
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import family members as contact entries' })
  @ApiOkResponse()
  async import(@Body() body: ImportFamiliesRequestDto): Promise<{ created: number }> {
    return this.importFamilies.execute(
      body.families.map((family) => ({
        fullName: family.fullName,
        phone: family.phone ?? null,
        email: family.email ?? null,
        relationship: family.relationship ?? null,
        primaryRecipientId: family.primaryRecipientId ?? null,
      })),
    );
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk edit the status of selected family members' })
  @ApiOkResponse()
  async bulk(@Body() body: BulkEditFamiliesRequestDto): Promise<BulkEditFamiliesResult> {
    return this.bulkEditFamilies.execute({
      ids: body.ids,
      status: toDomainStatus(body.status),
    });
  }

  @Put(':id/notes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the quick notes on a family member' })
  @ApiNoContentResponse()
  async editNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FamilyNotesRequestDto,
  ): Promise<void> {
    await this.editFamily.execute({
      entryId: id,
      section: 'NOTES',
      quickNotes: body.quickNotes ?? null,
    });
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the account status of a family member' })
  @ApiNoContentResponse()
  async editStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FamilyStatusRequestDto,
  ): Promise<void> {
    await this.editFamily.execute({
      entryId: id,
      section: 'STATUS',
      status: toDomainStatus(body.status),
    });
  }

  @Put(':id/emergency-verified')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set the emergency contact verified flag' })
  @ApiNoContentResponse()
  async editEmergencyVerified(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FamilyEmergencyVerifiedRequestDto,
  ): Promise<void> {
    await this.editFamily.execute({
      entryId: id,
      section: 'EMERGENCY_VERIFIED',
      verified: body.verified,
    });
  }

  @Put(':id/primary-recipient')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Link or clear the primary recipient of a family member' })
  @ApiNoContentResponse()
  async editPrimaryRecipient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FamilyPrimaryRecipientRequestDto,
  ): Promise<void> {
    await this.editFamily.execute({
      entryId: id,
      section: 'PRIMARY_RECIPIENT',
      recipientId: body.recipientId ?? null,
    });
  }

  @Put(':id/contact')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revise the captured contact details of a family member' })
  @ApiNoContentResponse()
  async editContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FamilyContactDto,
  ): Promise<void> {
    await this.editFamily.execute({
      entryId: id,
      section: 'CONTACT_DETAILS',
      fields: {
        fullName: body.fullName,
        phone: body.phone ?? null,
        email: body.email ?? null,
        relationship: body.relationship ?? null,
      },
    });
  }
}
