import { Schema, model } from 'mongoose';
import type { Role } from '@thoughtfull/shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ['member', 'professional'] satisfies Role[] },
    timezone: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const UserModel = model('User', userSchema);
