import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { WebSocketPublisher } from './websocket-publisher.service';
import { WebSocketTicketService } from './websocket-ticket.service';
import { WebSocketTicketController } from './websocket-ticket.controller';

@Module({
  controllers: [WebSocketTicketController],
  providers: [RedisService, WebSocketPublisher, WebSocketTicketService],
  exports: [WebSocketPublisher, WebSocketTicketService],
})
export class WebSocketModule {}
