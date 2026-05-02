import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    this.logger.debug('Fetching all users');
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Invalid user ID format: ${id}`);
      return null;
    }
    this.logger.debug(`Fetching user by ID: ${id}`);
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`Fetching user by email`);
    return this.userModel.findOne({ email }).exec();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    this.logger.debug(`Fetching user by Google ID`);
    return this.userModel.findOne({ googleId }).exec();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log('Creating new user');
    const createdUser = new this.userModel(createUserDto);
    const savedUser = await createdUser.save();
    this.logger.log(`User created successfully: id=${savedUser._id}`);
    return savedUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    this.logger.log(`Updating user: id=${id}`);
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    
    if (updatedUser) {
      this.logger.log(`User updated successfully: id=${id}`);
    } else {
      this.logger.warn(`User not found for update: id=${id}`);
    }
    
    return updatedUser;
  }
}
