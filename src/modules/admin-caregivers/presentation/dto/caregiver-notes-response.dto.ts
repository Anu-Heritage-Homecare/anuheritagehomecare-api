import { ApiProperty } from '@nestjs/swagger';
import {
  CaregiverNoteEntryResult,
  CaregiverNotesTabResult,
} from '../../application/dto/caregiver-notes.result';

class NoteCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() thisMonth!: number;
  @ApiProperty() internal!: number;
}

class NoteRangeDto {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
}

class NoteEntryDto implements CaregiverNoteEntryResult {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() typeLabel!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty({ nullable: true, type: String }) authorRole!: string | null;
  @ApiProperty() bySelf!: boolean;
  @ApiProperty() text!: string;
  @ApiProperty() date!: string;
}

class NotePageDto {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [NoteEntryDto] }) rows!: NoteEntryDto[];
}

/** The caregiver Notes tab response. */
export class CaregiverNotesResponseDto implements CaregiverNotesTabResult {
  @ApiProperty({ type: NoteCountsDto }) counts!: NoteCountsDto;
  @ApiProperty({ type: NoteRangeDto }) range!: NoteRangeDto;
  @ApiProperty({ type: NotePageDto }) notes!: NotePageDto;

  static fromResult(result: CaregiverNotesTabResult): CaregiverNotesResponseDto {
    return result;
  }
}
