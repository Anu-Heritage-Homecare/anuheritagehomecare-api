import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { ListCareRecipientsUseCase } from '../application/use-cases/list-care-recipients.use-case';
import { CareRecipientListResponseDto } from './dto/care-recipient-list-response.dto';
import { ListCareRecipientsQueryDto } from './dto/list-care-recipients-query.dto';

/**
 * Admin Care Recipients screen: the paginated, filterable, sortable roster of
 * everyone receiving care, plus the summary cards, filter tab counts and action
 * triggers. Requires a valid admin token. The controller stays thin.
 */
@ApiTags('admin-care-recipients')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/care-recipients', version: '1' })
export class AdminCareRecipientsController {
  constructor(private readonly list: ListCareRecipientsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'The care recipients list with summary, tab and trigger counts' })
  @ApiOkResponse({ type: CareRecipientListResponseDto })
  async listRecipients(
    @Query() query: ListCareRecipientsQueryDto,
  ): Promise<CareRecipientListResponseDto> {
    const result = await this.list.execute({
      tab: query.tab ?? 'ALL',
      search: query.search ?? null,
      sortField: query.sort ?? 'NAME',
      sortDirection: query.direction ?? 'ASC',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 8,
    });
    return CareRecipientListResponseDto.fromResult(result);
  }
}
