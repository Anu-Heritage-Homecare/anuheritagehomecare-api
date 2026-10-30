import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { ArchiveAnnouncementUseCase } from '../application/use-cases/archive-announcement.use-case';
import { CreateAnnouncementUseCase } from '../application/use-cases/create-announcement.use-case';
import { DuplicateAnnouncementUseCase } from '../application/use-cases/duplicate-announcement.use-case';
import { GetAnnouncementUseCase } from '../application/use-cases/get-announcement.use-case';
import { ListAnnouncementsUseCase } from '../application/use-cases/list-announcements.use-case';
import { PublishAnnouncementUseCase } from '../application/use-cases/publish-announcement.use-case';
import { AnnouncementCreatedDto } from './dto/announcement-ack.dto';
import { AnnouncementDetailResponseDto } from './dto/announcement-detail-response.dto';
import {
  CreateAnnouncementRequestDto,
  ListAnnouncementsQueryDto,
} from './dto/announcement-request.dto';
import { AnnouncementsListResponseDto } from './dto/announcements-list-response.dto';

/**
 * Back office announcements: the broadcast list, authoring (draft, schedule or
 * publish), viewing, duplicating, publishing and archiving. Every route requires
 * an admin token; announcements are an org wide office resource (no per admin
 * ownership). Controllers stay thin.
 */
@ApiTags('admin-announcements')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/announcements', version: '1' })
export class AdminAnnouncementsController {
  constructor(
    private readonly list: ListAnnouncementsUseCase,
    private readonly get: GetAnnouncementUseCase,
    private readonly create: CreateAnnouncementUseCase,
    private readonly duplicate: DuplicateAnnouncementUseCase,
    private readonly publish: PublishAnnouncementUseCase,
    private readonly archive: ArchiveAnnouncementUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The announcements list for a tab, with the per tab counts' })
  @ApiOkResponse({ type: AnnouncementsListResponseDto })
  async getList(@Query() query: ListAnnouncementsQueryDto): Promise<AnnouncementsListResponseDto> {
    const result = await this.list.execute(query.tab ?? 'PUBLISHED');
    return AnnouncementsListResponseDto.fromResult(result);
  }

  @Post()
  @ApiOperation({ summary: 'Author an announcement (draft, schedule or publish now)' })
  @ApiOkResponse({ type: AnnouncementCreatedDto })
  async createAnnouncement(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: CreateAnnouncementRequestDto,
  ): Promise<AnnouncementCreatedDto> {
    const result = await this.create.execute({
      authorAdminId: principal.adminUserId,
      title: body.title,
      body: body.body,
      audiences: body.audiences,
      priority: body.priority,
      action: body.action,
      scheduledFor: body.scheduledFor === undefined ? null : new Date(body.scheduledFor),
    });
    return { id: result.id };
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single announcement (the View screen)' })
  @ApiOkResponse({ type: AnnouncementDetailResponseDto })
  async getOne(@Param('id', ParseUUIDPipe) id: string): Promise<AnnouncementDetailResponseDto> {
    const result = await this.get.execute(id);
    return AnnouncementDetailResponseDto.fromResult(result);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an announcement as a fresh draft' })
  @ApiOkResponse({ type: AnnouncementCreatedDto })
  async duplicateAnnouncement(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementCreatedDto> {
    const result = await this.duplicate.execute(principal.adminUserId, id);
    return { id: result.id };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Publish a draft or scheduled announcement now' })
  async publishAnnouncement(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.publish.execute(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive an announcement' })
  async archiveAnnouncement(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.archive.execute(id);
  }
}
