import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnboardingStatus } from '@prisma/client';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  ADVANCE_TRANSITIONS,
  AdvanceTransition,
} from '../../application/use-cases/advance-application-stage.use-case';

const STATUSES = Object.values(OnboardingStatus);

/** The coordinator to assign to an onboarding application. */
export class AssignCoordinatorRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  coordinatorId!: string;
}

/** The verification status to set on an onboarding application. */
export class SetApplicationStatusRequestDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: OnboardingStatus;
}

/** A plain forward transition, with a caregiver when scheduling. */
export class AdvanceApplicationRequestDto {
  @ApiProperty({ enum: ADVANCE_TRANSITIONS })
  @IsIn(ADVANCE_TRANSITIONS)
  transition!: AdvanceTransition;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string;
}
