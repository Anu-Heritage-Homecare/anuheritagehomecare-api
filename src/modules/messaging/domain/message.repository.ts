import { Message } from './message.entity';

/** Persistence port for messages (append only). */
export interface MessageRepository {
  save(message: Message): Promise<void>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
