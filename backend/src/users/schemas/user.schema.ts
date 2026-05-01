import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  googleId: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('id').get(function() {
  return this._id.toString();
});
