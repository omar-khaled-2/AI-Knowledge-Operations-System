import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { WebSocketPublisher } from './websocket-publisher.service';

@Module({
  providers: [RedisService, WebSocketPublisher],
  exports: [WebSocketPublisher],
})
export class WebSocketModule {}
