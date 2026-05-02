import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectResponseDto } from "./dto/project-response.dto";
import { plainToInstance } from "class-transformer";

@Controller("projects")
@UseGuards(AuthGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly projectsService: ProjectsService) {}

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

  @Get()
  async findAll(@CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.debug(`Fetching all projects for user: ${userId}`);

    const projects = await this.projectsService.findAllByOwner(userId);
    this.logger.log(
      `Retrieved ${projects.length} projects for user: ${userId}`,
    );

    return plainToInstance(ProjectResponseDto, projects);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.debug(`Fetching project: id=${id}, userId=${userId}`);

    const project = await this.projectsService.findOne(id, userId);
    if (!project) {
      this.logger.warn(`Project not found: id=${id}, userId=${userId}`);
      throw new NotFoundException("Project not found");
    }

    this.logger.log(`Retrieved project: id=${id}`);
    return plainToInstance(ProjectResponseDto, project);
  }

  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Creating project for user: ${userId}`);

    const project = await this.projectsService.create(createProjectDto, userId);
    this.logger.log(`Project created: userId=${userId}`);

    return plainToInstance(ProjectResponseDto, project);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    const userId = this.getUserId(user);
    this.logger.log(`Updating project: id=${id}, userId=${userId}`);

    const project = await this.projectsService.update(
      id,
      updateProjectDto,
      userId,
    );
    if (!project) {
      this.logger.warn(
        `Project not found for update: id=${id}, userId=${userId}`,
      );
      throw new NotFoundException("Project not found");
    }

    this.logger.log(`Project updated: id=${id}`);
    return plainToInstance(ProjectResponseDto, project);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    const userId = this.getUserId(user);
    this.logger.log(`Deleting project: id=${id}, userId=${userId}`);

    const project = await this.projectsService.remove(id, userId);
    if (!project) {
      this.logger.warn(
        `Project not found for deletion: id=${id}, userId=${userId}`,
      );
      throw new NotFoundException("Project not found");
    }

    this.logger.log(`Project deleted: id=${id}`);
    return plainToInstance(ProjectResponseDto, project);
  }
}
