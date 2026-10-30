import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ConversationPriority } from '../../domain/conversation-priority.enum';

/** One uploaded file referenced on a message (metadata; bytes live in object storage). */
export class AttachmentInputDto {
  @ApiProperty({ description: 'Opaque storage key returned by the upload ticket' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({ example: 'BP_Reading_Jul18.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 421888, description: 'File size in bytes' })
  @IsInt()
  @Min(0)
  sizeBytes!: number;
}

const FOLDERS = [
  'ALL',
  'UNREAD',
  'DIRECT',
  'CAREGIVERS',
  'FAMILIES',
  'VISITS',
  'ANNOUNCEMENTS',
] as const;

export class InboxQueryDto {
  @ApiPropertyOptional({ enum: FOLDERS, default: 'ALL' })
  @IsOptional()
  @IsIn(FOLDERS)
  folder?: (typeof FOLDERS)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
}

export class StartConversationRequestDto {
  @ApiProperty({ type: [String], description: 'The mobile users to message (one thread each)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  counterpartyUserIds!: string[];

  @ApiPropertyOptional({ enum: ['DIRECT'], default: 'DIRECT' })
  @IsOptional()
  @IsIn(['DIRECT'])
  conversationType?: 'DIRECT';

  @ApiPropertyOptional({ description: 'Optional conversation subject (stored as the title)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationPriority, default: ConversationPriority.Normal })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiProperty({ example: 'Hi Amina, please confirm this afternoon.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional({ type: [AttachmentInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttachmentInputDto)
  attachments?: AttachmentInputDto[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() linkedCareRecipientId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() linkedVisitId?: string;
}

export class SendMessageRequestDto {
  @ApiProperty({ example: 'Thanks Amina. Did she take her morning medications?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional({ type: [AttachmentInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttachmentInputDto)
  attachments?: AttachmentInputDto[];
}
