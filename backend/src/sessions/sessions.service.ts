import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Invalid ID format: ${id}`);
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  async findAllByProject(
    projectId: string,
    ownerId: string,
    options: { page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' },
  ): Promise<{ sessions: Session[]; total: number }> {
    this.logger.debug(`Fetching sessions for project: ${projectId}, owner: ${ownerId}`);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [options.sortBy]: sortDirection };

    const filter = {
      projectId: this.toObjectId(projectId),
      owner: this.toObjectId(ownerId),
    };

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.sessionModel.countDocuments(filter),
    ]);

    this.logger.debug(`Retrieved ${sessions.length} sessions (total: ${total}) for project: ${projectId}`);
    return { sessions, total };
  }

  async findOne(id: string, ownerId: string): Promise<Session | null> {
    this.logger.debug(`Fetching session: id=${id}, ownerId=${ownerId}`);
    return this.sessionModel
      .findOne({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }

  async create(createSessionDto: CreateSessionDto, ownerId: string): Promise<SessionDocument> {
    this.logger.log(`Creating session for project: ${createSessionDto.projectId}, owner: ${ownerId}`);
    const createdSession = new this.sessionModel({
      ...createSessionDto,
      projectId: this.toObjectId(createSessionDto.projectId),
      owner: this.toObjectId(ownerId),
      messageCount: 0,
    });

    const savedSession = await createdSession.save();
    this.logger.log(`Session created successfully: id=${savedSession._id}, projectId=${createSessionDto.projectId}`);
    return savedSession;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, ownerId: string): Promise<Session | null> {
    this.logger.log(`Updating session: id=${id}, ownerId=${ownerId}`);
    
    const updatedSession = await this.sessionModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(id),
          owner: this.toObjectId(ownerId),
        },
        {
          ...updateSessionDto,
        },
        { new: true },
      )
      .exec();

    if (updatedSession) {
      this.logger.log(`Session updated successfully: id=${id}`);
    } else {
      this.logger.warn(`Session not found for update: id=${id}, ownerId=${ownerId}`);
    }

    return updatedSession;
  }

  async remove(id: string, ownerId: string): Promise<Session | null> {
    this.logger.log(`Deleting session: id=${id}, ownerId=${ownerId}`);
    const deletedSession = await this.sessionModel
      .findOneAndDelete({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();

    if (deletedSession) {
      this.logger.log(`Session deleted successfully: id=${id}`);
    } else {
      this.logger.warn(`Session not found for deletion: id=${id}, ownerId=${ownerId}`);
    }

    return deletedSession;
  }

  async incrementMessageCount(id: string, ownerId: string): Promise<Session | null> {
    this.logger.debug(`Incrementing message count for session: ${id}`);
    
    return this.sessionModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(id),
          owner: this.toObjectId(ownerId),
        },
        { $inc: { messageCount: 1 } },
        { new: true },
      )
      .exec();
  }
}
