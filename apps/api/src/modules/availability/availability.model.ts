import { Schema, model } from 'mongoose';

const intervalSchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false },
);

const availabilitySchema = new Schema(
  {
    professionalId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    intervals: { type: [intervalSchema], default: [] },
    blockedDates: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const AvailabilityModel = model('Availability', availabilitySchema);
