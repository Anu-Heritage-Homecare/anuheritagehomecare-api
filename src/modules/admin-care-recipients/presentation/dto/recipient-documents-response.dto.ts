import { ApiProperty } from '@nestjs/swagger';
import { RecipientDocumentsResult } from '../../application/dto/recipient-documents.result';

class DocumentsSummaryDto {
  @ApiProperty() totalDocuments!: number;
  @ApiProperty() pendingReview!: number;
  @ApiProperty() expiringSoon!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastUploadAt!: string | null;
}

class DocumentCategoryCountDto {
  @ApiProperty() category!: string;
  @ApiProperty() count!: number;
}

class DocumentItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ type: String, format: 'date-time' }) uploadedAt!: string;
  @ApiProperty({ nullable: true }) uploadedByName!: string | null;
  @ApiProperty() displayStatus!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) expiresAt!: string | null;
}

class DocumentsPageDto {
  @ApiProperty({ type: [DocumentItemDto] }) items!: DocumentItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

class DocumentActivityDto {
  @ApiProperty() documentName!: string;
  @ApiProperty({ nullable: true }) uploadedByName!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
}

export class RecipientDocumentsResponseDto {
  @ApiProperty({ type: DocumentsSummaryDto }) summary!: DocumentsSummaryDto;
  @ApiProperty() all!: number;
  @ApiProperty({ type: [DocumentCategoryCountDto] }) categories!: DocumentCategoryCountDto[];
  @ApiProperty({ type: DocumentsPageDto }) page!: DocumentsPageDto;
  @ApiProperty({ type: [DocumentActivityDto] }) activity!: DocumentActivityDto[];

  static fromResult(result: RecipientDocumentsResult): RecipientDocumentsResponseDto {
    const dto = new RecipientDocumentsResponseDto();
    dto.summary = {
      totalDocuments: result.summary.totalDocuments,
      pendingReview: result.summary.pendingReview,
      expiringSoon: result.summary.expiringSoon,
      lastUploadAt:
        result.summary.lastUploadAt === null ? null : result.summary.lastUploadAt.toISOString(),
    };
    dto.all = result.all;
    dto.categories = result.categories.map((c) => ({ ...c }));
    dto.page = {
      items: result.page.items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        uploadedAt: item.uploadedAt.toISOString(),
        uploadedByName: item.uploadedByName,
        displayStatus: item.displayStatus,
        sizeBytes: item.sizeBytes,
        expiresAt: item.expiresAt === null ? null : item.expiresAt.toISOString(),
      })),
      page: result.page.page,
      pageSize: result.page.pageSize,
      total: result.page.total,
      totalPages: result.page.totalPages,
    };
    dto.activity = result.activity.map((a) => ({
      documentName: a.documentName,
      uploadedByName: a.uploadedByName,
      at: a.at.toISOString(),
    }));
    return dto;
  }
}
