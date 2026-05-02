import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Invalid ID format: ${id}`);
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  async findAllByOwner(ownerId: string): Promise<Project[]> {
    this.logger.debug(`Fetching projects for owner: ${ownerId}`);
    return this.projectModel
      .find({ owner: this.toObjectId(ownerId) })
      .sort({ lastUpdated: -1 })
      .exec();
  }

  async findOne(id: string, ownerId: string): Promise<Project | null> {
    this.logger.debug(`Fetching project: id=${id}, ownerId=${ownerId}`);
    return this.projectModel
      .findOne({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }

  async create(createProjectDto: CreateProjectDto, ownerId: string): Promise<Project> {
    this.logger.log(`Creating project for owner: ${ownerId}`);
    const createdProject = new this.projectModel({
      ...createProjectDto,
      owner: this.toObjectId(ownerId),
      lastUpdated: new Date(),
    });
    const savedProject = await createdProject.save();
    this.logger.log(`Project created successfully: id=${savedProject._id}, ownerId=${ownerId}`);
    return savedProject;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, ownerId: string): Promise<Project | null> {
    this.logger.log(`Updating project: id=${id}, ownerId=${ownerId}`);
    const updatedProject = await this.projectModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(id),
          owner: this.toObjectId(ownerId),
        },
        {
          ...updateProjectDto,
          lastUpdated: new Date(),
        },
        { new: true },
      )
      .exec();

    if (updatedProject) {
      this.logger.log(`Project updated successfully: id=${id}`);
    } else {
      this.logger.warn(`Project not found for update: id=${id}, ownerId=${ownerId}`);
    }

    return updatedProject;
  }

  async remove(id: string, ownerId: string): Promise<Project | null> {
    this.logger.log(`Deleting project: id=${id}, ownerId=${ownerId}`);
    const deletedProject = await this.projectModel
      .findOneAndDelete({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();

    if (deletedProject) {
      this.logger.log(`Project deleted successfully: id=${id}`);
    } else {
      this.logger.warn(`Project not found for deletion: id=${id}, ownerId=${ownerId}`);
    }

    return deletedProject;
  }
}
