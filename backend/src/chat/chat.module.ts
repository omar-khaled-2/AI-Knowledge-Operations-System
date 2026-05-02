import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    MessagesModule,
  ],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
