import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NoteAudience } from '../../domain/note-audience.enum';

const MAX_NOTE_LENGTH = 4000;

/**
 * A note the caregiver adds to the visit feed. The text is free text about the
 * recipient, so it is sensitive and excluded from logs. The audience says who the
 * note is for and defaults to the family.
 */
export class AddVisitNoteRequestDto {
  @ApiProperty({ example: 'Mary was cheerful today and enjoyed a short walk.' })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_NOTE_LENGTH)
  text!: string;

  @ApiPropertyOptional({
    enum: NoteAudience,
    enumName: 'NoteAudience',
    default: NoteAudience.Family,
    description: 'Who the note is for (defaults to the family)',
  })
  @IsOptional()
  @IsEnum(NoteAudience)
  audience?: NoteAudience;
}
