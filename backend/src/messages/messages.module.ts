import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { InternalMessagesController } from './internal-messages.controller';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { WebSocketModule } from '../websocket/websocket.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    WebSocketModule,
    AuthModule,
    ChatModule,
    SessionsModule,
  ],
  controllers: [MessagesController, InternalMessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
