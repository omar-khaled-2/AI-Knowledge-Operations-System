import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    WebSocketModule,
  ],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
