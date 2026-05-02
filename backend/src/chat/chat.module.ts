import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    WebSocketModule,
  ],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
