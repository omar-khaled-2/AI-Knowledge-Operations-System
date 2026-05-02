import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SessionsService } from "./sessions.service";
import { ProjectsService } from "../projects/projects.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { UpdateSessionDto } from "./dto/update-session.dto";
import { SessionResponseDto } from "./dto/session-response.dto";
import { plainToInstance } from "class-transformer";

@Controller("sessions")
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Safely extract and validate the user ID from the auth session.
   * better-auth may return user.id, user._id, or user.userId depending on version.
   */
  private getUserId(user: any): string {
    if (!user) {
      this.logger.warn("Authentication failed: user not found in request");
      throw new UnauthorizedException("User not authenticated");
    }

    const userId = user.id || user._id || user.userId;

    if (!userId) {
      this.logger.warn("Authentication failed: user ID not found in session");
      throw new UnauthorizedException("User ID not found in session");
    }

    const idString = userId.toString();

    if (!Types.ObjectId.isValid(idString)) {
      this.logger.warn(`Invalid user ID format: ${idString}`);
      throw new BadRequestException(`Invalid user ID format: ${idString}`);
    }

    return idString;
  }

  /**
   * Verify that the project exists and belongs to the authenticated user.
   * Prevents IDOR attacks where users create sessions in other users' projects.
   */
  private async verifyProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectsService.findOne(projectId, userId);
    if (!project) {
      this.logger.warn(`Project ownership verification failed: projectId=${projectId}, userId=${userId}`);
      throw new ForbiddenException("Project not found or access denied");
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(
    @Query("projectId") projectId: string,
    @Query("page") pageStr: string,
    @Query("limit") limitStr: string,
    @Query("sortBy") sortBy: string,
    @Query("sortOrder") sortOrder: string,
    @CurrentUser() user: any,
  ) {
    if (!projectId) {
      this.logger.warn("Missing projectId query parameter");
      throw new BadRequestException("projectId query parameter is required");
    }

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 12));
    const sortByField = sortBy || "updatedAt";
    const sortOrderValue = sortOrder === "asc" ? "asc" : "desc";

    const userId = this.getUserId(user);
    this.logger.debug(`Fetching sessions for project: ${projectId}, userId=${userId}, page=${page}, limit=${limit}`);
    
    const result = await this.sessionsService.findAllByProject(
      projectId,
      userId,
      {
        page,
        limit,
        sortBy: sortByField,
        sortOrder: sortOrderValue,
      },
    );

    this.logger.log(`Retrieved ${result.sessions.length} sessions (total: ${result.total}) for project: ${projectId}`);
    return {
      data: plainToInstance(SessionResponseDto, result.sessions),
      total: result.total,
    };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.debug(`Fetching session: id=${id}, userId=${userId}`);
    
    const session = await this.sessionsService.findOne(id, userId);
    if (!session) {
      this.logger.warn(`Session not found: id=${id}, userId=${userId}`);
      throw new NotFoundException("Session not found");
    }
    
    this.logger.log(`Retrieved session: id=${id}`);
    return plainToInstance(SessionResponseDto, session);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Creating session for project: ${createSessionDto.projectId}, userId=${userId}`);
    
    await this.verifyProjectOwnership(createSessionDto.projectId, userId);
    const session = await this.sessionsService.create(
      createSessionDto,
      userId,
    );
    
    this.logger.log(`Session created: id=${session._id}, projectId=${createSessionDto.projectId}`);
    return plainToInstance(SessionResponseDto, session);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  async update(
    @Param("id") id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Updating session: id=${id}, userId=${userId}`);
    
    const session = await this.sessionsService.update(
      id,
      updateSessionDto,
      userId,
    );
    if (!session) {
      this.logger.warn(`Session not found for update: id=${id}, userId=${userId}`);
      throw new NotFoundException("Session not found");
    }
    
    this.logger.log(`Session updated: id=${id}`);
    return plainToInstance(SessionResponseDto, session);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.log(`Deleting session: id=${id}, userId=${userId}`);
    
    const session = await this.sessionsService.remove(id, userId);
    if (!session) {
      this.logger.warn(`Session not found for deletion: id=${id}, userId=${userId}`);
      throw new NotFoundException("Session not found");
    }
    
    this.logger.log(`Session deleted: id=${id}`);
    return plainToInstance(SessionResponseDto, session);
  }
}
