import { ApiProperty } from '@nestjs/swagger';
import { MessageResult } from '../../application/dto/message.result';

/** Generic acknowledgement response. */
export class MessageResponseDto {
  @ApiProperty()
  message!: string;

  static fromResult(result: MessageResult): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.message = result.message;
    return dto;
  }
}
