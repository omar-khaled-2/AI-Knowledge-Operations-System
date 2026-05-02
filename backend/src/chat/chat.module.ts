import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagesModule } from '../messages/messages.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    MessagesModule,
    WebSocketModule,
    SessionsModule,
  ],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
