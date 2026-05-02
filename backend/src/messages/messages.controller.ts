import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, ListMessagesQueryDto } from './dto/message.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WebSocketPublisher } from '../websocket/websocket-publisher.service';

@Controller('api/v1/chat/sessions/:sessionId/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly wsPublisher: WebSocketPublisher,
  ) {}

  @Get()
  async findAll(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: { id: string },
    @Query() query: ListMessagesQueryDto,
  ) {
    const page = query.page ? parseInt(query.page.toString(), 10) : 1;
    const limit = query.limit ? parseInt(query.limit.toString(), 10) : 50;
    
    return this.messagesService.findBySession(sessionId, { page, limit });
  }

  @Post()
  async create(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: { id: string },
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const message = await this.messagesService.create({
      ...createMessageDto,
      sessionId,
      userId: user.id,
    });

    // Emit message.created event to user's WebSocket channel
    await this.wsPublisher.sendToUser(user.id, {
      event: 'message.created',
      version: '1.0',
      timestamp: new Date().toISOString(),
      userId: user.id,
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

    this.logger.debug(`Emitted message.created event for user ${user.id}, session ${sessionId}`);

    return message;
  }

  @Delete()
  async removeAll(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: { id: string },
  ) {
    const deletedCount = await this.messagesService.deleteBySession(sessionId);
    return { deletedCount };
  }
}
