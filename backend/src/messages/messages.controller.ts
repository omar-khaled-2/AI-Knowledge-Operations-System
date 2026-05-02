import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, ListMessagesQueryDto } from './dto/message.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/chat/sessions/:sessionId/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

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
    return this.messagesService.create({
      ...createMessageDto,
      sessionId,
      userId: user.id,
    });
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
