import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagesModule } from '../messages/messages.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MessagesModule,
    WebSocketModule,
  ],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
