import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { CreateMessageDto, MessageResponseDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<ChatMessageDocument> {
    this.logger.debug(`Creating message for session: ${createMessageDto.sessionId}`);
    
    const message = new this.chatMessageModel({
      sessionId: new Types.ObjectId(createMessageDto.sessionId),
      userId: new Types.ObjectId(createMessageDto.userId),
      role: createMessageDto.role,
      content: createMessageDto.content,
      sources: createMessageDto.sources,
    });

    const savedMessage = await message.save();
    this.logger.debug(`Message created: ${savedMessage._id}`);
    return savedMessage;
  }

  async findBySession(
    sessionId: string,
    options: { page: number; limit: number } = { page: 1, limit: 50 },
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    this.logger.debug(`Fetching messages for session: ${sessionId}, page: ${options.page}, limit: ${options.limit}`);
    
    const skip = (options.page - 1) * options.limit;
    
    const [messages, total] = await Promise.all([
      this.chatMessageModel
        .find({ sessionId: new Types.ObjectId(sessionId) })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(options.limit)
        .lean()
        .exec(),
      this.chatMessageModel.countDocuments({ sessionId: new Types.ObjectId(sessionId) }),
    ]);

    const messageDtos: MessageResponseDto[] = messages.map((msg) => ({
      id: msg._id.toString(),
      sessionId: msg.sessionId.toString(),
      userId: msg.userId.toString(),
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      createdAt: msg.createdAt,
    }));

    this.logger.debug(`Retrieved ${messageDtos.length} messages (total: ${total}) for session: ${sessionId}`);
    return { messages: messageDtos, total };
  }

  async deleteBySession(sessionId: string): Promise<number> {
    this.logger.log(`Deleting all messages for session: ${sessionId}`);
    const result = await this.chatMessageModel.deleteMany({
      sessionId: new Types.ObjectId(sessionId),
    });
    this.logger.log(`Deleted ${result.deletedCount} messages for session: ${sessionId}`);
    return result.deletedCount || 0;
  }
}
