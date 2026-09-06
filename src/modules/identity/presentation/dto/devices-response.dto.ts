import { ApiProperty } from '@nestjs/swagger';
import { DeviceView } from '../../application/use-cases/device-session.use-cases';

class DeviceDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'iPhone 15' }) deviceLabel!: string;
  @ApiProperty({ nullable: true, example: '102.89.34.12' }) ipAddress!: string | null;
  @ApiProperty() lastUsedAt!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ description: 'True for the device making this request' }) isCurrent!: boolean;

  static from(view: DeviceView): DeviceDto {
    return Object.assign(new DeviceDto(), view);
  }
}

/** HTTP response for the Trusted Devices list. */
export class DevicesResponseDto {
  @ApiProperty({ type: [DeviceDto] })
  devices!: DeviceDto[];

  @ApiProperty({ description: 'Number of active devices' })
  count!: number;

  static fromViews(views: DeviceView[]): DevicesResponseDto {
    const dto = new DevicesResponseDto();
    dto.devices = views.map((view) => DeviceDto.from(view));
    dto.count = views.length;
    return dto;
  }
}
