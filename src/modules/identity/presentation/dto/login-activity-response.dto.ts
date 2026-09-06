import { ApiProperty } from '@nestjs/swagger';
import { LoginActivityView } from '../../application/use-cases/get-login-activity.use-case';

class LoginActivityItemDto {
  @ApiProperty() at!: string;
  @ApiProperty({ enum: ['SUCCESS', 'FAILURE'] }) outcome!: string;
  @ApiProperty({ nullable: true, example: 'iPhone 15' }) deviceLabel!: string | null;
  @ApiProperty({ nullable: true, example: '102.89.34.12' }) ipAddress!: string | null;

  static from(view: LoginActivityView): LoginActivityItemDto {
    return Object.assign(new LoginActivityItemDto(), view);
  }
}

/** HTTP response for the Login Activity screen. */
export class LoginActivityResponseDto {
  @ApiProperty({ type: [LoginActivityItemDto] })
  activity!: LoginActivityItemDto[];

  static fromViews(views: LoginActivityView[]): LoginActivityResponseDto {
    const dto = new LoginActivityResponseDto();
    dto.activity = views.map((view) => LoginActivityItemDto.from(view));
    return dto;
  }
}
