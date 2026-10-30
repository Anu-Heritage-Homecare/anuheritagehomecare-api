import {
  Body,
  Controller,
  Delete,
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
import { CreateAttachmentUploadTicketUseCase } from '../application/use-cases/create-attachment-upload-ticket.use-case';
import { DeleteAttachmentUseCase } from '../application/use-cases/delete-attachment.use-case';
import { GetAttachmentPreviewUseCase } from '../application/use-cases/get-attachment-preview.use-case';
import { GetInboxUseCase } from '../application/use-cases/get-inbox.use-case';
import { GetThreadUseCase } from '../application/use-cases/get-thread.use-case';
import { MarkConversationReadUseCase } from '../application/use-cases/mark-conversation-read.use-case';
import { SendMessageUseCase } from '../application/use-cases/send-message.use-case';
import { StartConversationUseCase } from '../application/use-cases/start-conversation.use-case';
import { AttachmentPreviewResponseDto } from './dto/attachment-preview-response.dto';
import { AttachmentUploadTicketResponseDto } from './dto/attachment-upload-ticket-response.dto';
import { InboxResponseDto } from './dto/inbox-response.dto';
import { ConversationCreatedDto, MessageSentDto } from './dto/messaging-ack.dto';
import {
  InboxQueryDto,
  SendMessageRequestDto,
  StartConversationRequestDto,
} from './dto/messaging-request.dto';
import { ThreadResponseDto } from './dto/thread-response.dto';

/**
 * Back office messaging: the inbox, conversation threads, sending messages and
 * marking read. Every route requires an admin token and is scoped to the admin's
 * own inbox. Controllers stay thin.
 */
@ApiTags('admin-messaging')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/messages', version: '1' })
export class AdminMessagingController {
  constructor(
    private readonly getInbox: GetInboxUseCase,
    private readonly getThread: GetThreadUseCase,
    private readonly startConversation: StartConversationUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly markRead: MarkConversationReadUseCase,
    private readonly uploadTicket: CreateAttachmentUploadTicketUseCase,
    private readonly getAttachment: GetAttachmentPreviewUseCase,
    private readonly deleteAttachment: DeleteAttachmentUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'The messaging inbox: folder counts and the filtered conversation list',
  })
  @ApiOkResponse({ type: InboxResponseDto })
  async inbox(
    @CurrentAdmin() principal: AdminPrincipal,
    @Query() query: InboxQueryDto,
  ): Promise<InboxResponseDto> {
    const result = await this.getInbox.execute({
      adminId: principal.adminUserId,
      folder: query.folder ?? 'ALL',
      search: query.search ?? null,
    });
    return InboxResponseDto.fromResult(result);
  }

  @Post()
  @ApiOperation({
    summary: 'Start (or reuse) a direct conversation per recipient and post the first message',
  })
  @ApiOkResponse({ type: ConversationCreatedDto })
  async start(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() body: StartConversationRequestDto,
  ): Promise<ConversationCreatedDto> {
    const result = await this.startConversation.execute({
      adminId: principal.adminUserId,
      counterpartyUserIds: body.counterpartyUserIds,
      body: body.body,
      subject: body.subject ?? null,
      priority: body.priority,
      attachments: body.attachments,
      linkedCareRecipientId: body.linkedCareRecipientId ?? null,
      linkedVisitId: body.linkedVisitId ?? null,
    });
    return { conversationIds: result.conversationIds };
  }

  @Post('attachments/upload-ticket')
  @ApiOperation({ summary: 'Issue a signed ticket to upload a message attachment to the store' })
  @ApiOkResponse({ type: AttachmentUploadTicketResponseDto })
  uploadAttachmentTicket(
    @CurrentAdmin() principal: AdminPrincipal,
  ): AttachmentUploadTicketResponseDto {
    return AttachmentUploadTicketResponseDto.fromTicket(
      this.uploadTicket.execute(principal.adminUserId),
    );
  }

  @Get('attachments/:id')
  @ApiOperation({ summary: 'The File Preview panel for one attachment' })
  @ApiOkResponse({ type: AttachmentPreviewResponseDto })
  async attachment(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttachmentPreviewResponseDto> {
    const result = await this.getAttachment.execute(principal.adminUserId, id);
    return AttachmentPreviewResponseDto.fromResult(result);
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attachment from a conversation' })
  async removeAttachment(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteAttachment.execute(principal.adminUserId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A conversation thread (header, linked record and messages)' })
  @ApiOkResponse({ type: ThreadResponseDto })
  async thread(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ThreadResponseDto> {
    const result = await this.getThread.execute(principal.adminUserId, id);
    return ThreadResponseDto.fromResult(result);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Post a message to a conversation' })
  @ApiOkResponse({ type: MessageSentDto })
  async post(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendMessageRequestDto,
  ): Promise<MessageSentDto> {
    const result = await this.sendMessage.execute({
      adminId: principal.adminUserId,
      conversationId: id,
      body: body.body,
      attachments: body.attachments,
    });
    return { messageId: result.messageId };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a conversation read' })
  async read(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.markRead.execute(principal.adminUserId, id);
  }
}
