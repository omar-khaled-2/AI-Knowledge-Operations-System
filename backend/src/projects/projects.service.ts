import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  async findAllByOwner(ownerId: string): Promise<Project[]> {
    return this.projectModel
      .find({ owner: this.toObjectId(ownerId) })
      .sort({ lastUpdated: -1 })
      .exec();
  }

  async findOne(id: string, ownerId: string): Promise<Project | null> {
    return this.projectModel
      .findOne({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }

  async create(createProjectDto: CreateProjectDto, ownerId: string): Promise<Project> {
    const createdProject = new this.projectModel({
      ...createProjectDto,
      owner: this.toObjectId(ownerId),
      lastUpdated: new Date(),
    });
    return createdProject.save();
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, ownerId: string): Promise<Project | null> {
    return this.projectModel
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
  }

  async remove(id: string, ownerId: string): Promise<Project | null> {
    return this.projectModel
      .findOneAndDelete({
        _id: this.toObjectId(id),
        owner: this.toObjectId(ownerId),
      })
      .exec();
  }
}
