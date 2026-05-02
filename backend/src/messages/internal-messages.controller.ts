import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MessagesService } from './messages.service';
import { SessionsService } from '../sessions/sessions.service';
import { ChatService } from '../chat/chat.service';
import { CreateMessageDto, ListMessagesQueryDto, MessageResponseDto } from './dto/message.dto';
import { WebSocketPublisher } from '../websocket/websocket-publisher.service';

/**
 * Internal Messages Controller - No Auth Guard
 * 
 * Used by internal services (chat-service) to create/fetch messages.
 * Should NOT be exposed externally - only accessible within the cluster.
 */
@Controller('internal/chat/sessions/:sessionId/messages')
export class InternalMessagesController {
  private readonly logger = new Logger(InternalMessagesController.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly sessionsService: SessionsService,
    private readonly chatService: ChatService,
    private readonly wsPublisher: WebSocketPublisher,
  ) {}

  @Get()
  async findAll(
    @Param('sessionId') sessionId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    const page = query.page ? parseInt(query.page.toString(), 10) : 1;
    const limit = query.limit ? parseInt(query.limit.toString(), 10) : 50;
    
    return this.messagesService.findBySession(sessionId, { page, limit });
  }

  @Post()
  async create(
    @Param('sessionId') sessionId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const message = await this.messagesService.create({
      ...createMessageDto,
      sessionId,
    });

    // Emit message.created event to user's WebSocket channel
    await this.wsPublisher.sendToUser(message.userId.toString(), {
      event: 'message.created',
      version: '1.0',
      timestamp: new Date().toISOString(),
      userId: message.userId.toString(),
      payload: {
        sessionId,
        message: {
          id: message.id,
          role: message.role,
          content: message.content,
          sources: message.sources,
          createdAt: message.createdAt,
        },
      },
    });

    this.logger.debug(`Emitted message.created event for user ${message.userId.toString()}, session ${sessionId}`);

    // Only trigger AI processing for user messages to avoid infinite loops
    if (message.role === 'user') {
      try {
        const session = await this.sessionsService.findOne(sessionId, message.userId.toString());
        if (session) {
          await this.chatService.publishProcessNotification(
            message.userId.toString(),
            sessionId,
            session.projectId ? session.projectId.toString() : null,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to publish chat:process: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return plainToInstance(MessageResponseDto, message);
  }
}
