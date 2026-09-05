import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { InvoiceListFilter } from '../../application/use-cases/list-invoices.use-case';

/** Query for the invoices list, backing the All, Paid and Outstanding tabs. */
export class ListInvoicesFilterDto {
  @ApiPropertyOptional({
    enum: ['PAID', 'OUTSTANDING'],
    description: 'Restrict to paid or outstanding invoices; omit for all',
  })
  @IsOptional()
  @IsIn(['PAID', 'OUTSTANDING'])
  status?: InvoiceListFilter;
}
