import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { CarePlanResult } from '../../application/dto/care-plan.result';
import { BillingModel } from '../../domain/billing-model.enum';
import { CarePlanType } from '../../domain/care-plan-type.enum';

class CarePlanPriceDto {
  @ApiProperty({ enum: Currency, enumName: 'Currency' })
  currency!: Currency;

  @ApiProperty({
    description: 'Hourly rate (hourly plans) or monthly price (monthly plans), in minor units',
  })
  unitAmountMinor!: number;

  @ApiProperty({ description: 'Flat per booking fee in minor units' })
  serviceFeeMinor!: number;
}

/** HTTP response contract for a care plan priced in the owner's currency. */
export class CarePlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CarePlanType, enumName: 'CarePlanType' })
  type!: CarePlanType;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: BillingModel, enumName: 'BillingModel' })
  billingModel!: BillingModel;

  @ApiProperty({ isArray: true, type: Number, description: 'Bookable hour options (hourly plans)' })
  allowedHours!: number[];

  @ApiPropertyOptional({ type: CarePlanPriceDto, nullable: true })
  price!: CarePlanPriceDto | null;

  static fromResult(result: CarePlanResult): CarePlanResponseDto {
    const dto = new CarePlanResponseDto();
    dto.id = result.id;
    dto.type = result.type;
    dto.name = result.name;
    dto.description = result.description;
    dto.billingModel = result.billingModel;
    dto.allowedHours = result.allowedHours;
    dto.price = result.price;
    return dto;
  }
}
