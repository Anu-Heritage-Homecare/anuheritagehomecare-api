import { ApiProperty } from '@nestjs/swagger';

export class ConversationCreatedDto {
  @ApiProperty({ type: [String], description: 'One conversation id per recipient' })
  conversationIds!: string[];
}

export class MessageSentDto {
  @ApiProperty() messageId!: string;
}
