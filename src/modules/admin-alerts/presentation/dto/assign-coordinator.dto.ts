import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Assign the coordinator handling an incident. */
export class AssignCoordinatorDto {
  @ApiProperty() @IsUUID() coordinatorAdminId!: string;
}
