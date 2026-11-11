import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_LOGIN_HISTORY_READ_PORT,
  AdminLoginHistoryReadPort,
  LoginHistoryEntry,
} from '../ports/admin-login-history-read.port';

export interface GetLoginHistoryCommand {
  page?: number;
  pageSize?: number;
}

export interface LoginHistoryPageResult {
  entries: LoginHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Use case: a page of the admin login history (the View All Logs action). */
@Injectable()
export class GetLoginHistoryUseCase {
  constructor(
    @Inject(ADMIN_LOGIN_HISTORY_READ_PORT) private readonly history: AdminLoginHistoryReadPort,
  ) {}

  async execute(command: GetLoginHistoryCommand): Promise<LoginHistoryPageResult> {
    const page = command.page && command.page > 0 ? command.page : 1;
    const pageSize = Math.min(
      command.pageSize && command.pageSize > 0 ? command.pageSize : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const { entries, total } = await this.history.page(page, pageSize);
    return { entries, total, page, pageSize };
  }
}
