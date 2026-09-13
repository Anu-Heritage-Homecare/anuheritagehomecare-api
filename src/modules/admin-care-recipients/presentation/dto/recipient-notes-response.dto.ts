import { ApiProperty } from '@nestjs/swagger';
import { RecipientNotesResult } from '../../application/dto/recipient-notes.result';

class NotesSummaryDto {
  @ApiProperty() totalNotes!: number;
  @ApiProperty() thisMonth!: number;
  @ApiProperty() flaggedForReview!: number;
}

class NoteCategoryCountDto {
  @ApiProperty() category!: string;
  @ApiProperty() count!: number;
}

class NoteItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() category!: string;
  @ApiProperty() content!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty({ nullable: true }) authorRole!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) postedAt!: string;
  @ApiProperty() flaggedForReview!: boolean;
  @ApiProperty() acknowledged!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) acknowledgedAt!:
    string | null;
  @ApiProperty() commentCount!: number;
  @ApiProperty() attachmentCount!: number;
}

class NotesPageDto {
  @ApiProperty({ type: [NoteItemDto] }) items!: NoteItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class RecipientNotesResponseDto {
  @ApiProperty({ type: NotesSummaryDto }) summary!: NotesSummaryDto;
  @ApiProperty() all!: number;
  @ApiProperty({ type: [NoteCategoryCountDto] }) categories!: NoteCategoryCountDto[];
  @ApiProperty({ type: [String] }) authors!: string[];
  @ApiProperty({ type: NotesPageDto }) page!: NotesPageDto;

  static fromResult(result: RecipientNotesResult): RecipientNotesResponseDto {
    const dto = new RecipientNotesResponseDto();
    dto.summary = {
      totalNotes: result.summary.totalNotes,
      thisMonth: result.summary.thisMonth,
      flaggedForReview: result.summary.flaggedForReview,
    };
    dto.all = result.all;
    dto.categories = result.categories.map((c) => ({ ...c }));
    dto.authors = [...result.authors];
    dto.page = {
      items: result.page.items.map((item) => ({
        id: item.id,
        category: item.category,
        content: item.content,
        authorName: item.authorName,
        authorRole: item.authorRole,
        postedAt: item.postedAt.toISOString(),
        flaggedForReview: item.flaggedForReview,
        acknowledged: item.acknowledged,
        acknowledgedAt: item.acknowledgedAt === null ? null : item.acknowledgedAt.toISOString(),
        commentCount: item.commentCount,
        attachmentCount: item.attachmentCount,
      })),
      page: result.page.page,
      pageSize: result.page.pageSize,
      total: result.page.total,
      totalPages: result.page.totalPages,
    };
    return dto;
  }
}
