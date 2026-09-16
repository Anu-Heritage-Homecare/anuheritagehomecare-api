import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionListResult,
  TransactionRowResult,
} from '../../application/dto/transaction-list.result';

class TransactionRowDto implements TransactionRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ nullable: true, type: String }) clientName!: string | null;
  @ApiProperty() provider!: string;
  @ApiProperty() payableType!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
}

/** The transaction log response for one currency. */
export class TransactionListResponseDto implements TransactionListResult {
  @ApiProperty() currency!: string;
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [TransactionRowDto] }) rows!: TransactionRowDto[];

  static fromResult(result: TransactionListResult): TransactionListResponseDto {
    return result;
  }
}
