import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { Document, DocumentSchema } from './schemas/document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentEventsListener } from './listeners/document-events.listener';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Document.name, schema: DocumentSchema }]),
    AuthModule,
    ProjectsModule,
    RabbitMQModule,
    WebSocketModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentEventsListener],
  exports: [DocumentsService],
})
export class DocumentsModule {}
