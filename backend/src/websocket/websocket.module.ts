import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RedisService } from './redis.service';
import { WebSocketPublisher } from './websocket-publisher.service';
import { WebSocketTicketService } from './websocket-ticket.service';
import { WebSocketTicketController } from './websocket-ticket.controller';

@Module({
  imports: [AuthModule],
  controllers: [WebSocketTicketController],
  providers: [RedisService, WebSocketPublisher, WebSocketTicketService],
  exports: [RedisService, WebSocketPublisher, WebSocketTicketService],
})
export class WebSocketModule {}
