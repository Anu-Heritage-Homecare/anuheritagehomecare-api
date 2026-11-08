import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsEnum } from 'class-validator';
import { InvoiceReminderPreviewResult } from '../../application/dto/invoice-reminder-preview.result';
import { ReminderChannel } from '../../application/invoice-reminder.message';

const CHANNELS: ReminderChannel[] = ['EMAIL', 'SMS'];

/** The Send Payment Reminder modal: the chosen channels (Send via). */
export class SendInvoiceReminderRequestDto {
  @ApiProperty({ enum: CHANNELS, isArray: true, example: ['EMAIL', 'SMS'] })
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(CHANNELS, { each: true })
  channels!: ReminderChannel[];
}

/** The reminder preview: the facts and the composed message. */
export class InvoiceReminderPreviewResponseDto implements InvoiceReminderPreviewResult {
  @ApiProperty({ example: 'INV-2026-451' }) invoiceNumber!: string;
  @ApiProperty({ example: 145_000_000, description: 'Outstanding amount due, in minor units' })
  amountDueMinor!: number;
  @ApiProperty({ example: 'NGN' }) currency!: string;
  @ApiProperty({ example: 5 }) daysOverdue!: number;
  @ApiProperty({ example: 'Payment Reminder: Invoice INV-2026-451' }) subject!: string;
  @ApiProperty() body!: string;

  static fromResult(result: InvoiceReminderPreviewResult): InvoiceReminderPreviewResponseDto {
    return result;
  }
}
