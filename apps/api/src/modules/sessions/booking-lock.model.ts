import { Schema, model } from 'mongoose';

const bookingLockSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false },
);

export const BookingLockModel = model('BookingLock', bookingLockSchema);
