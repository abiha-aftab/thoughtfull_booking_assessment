import { Schema, model } from 'mongoose';

const reminderSchema = new Schema(
  {
    reminderId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, required: true, enum: ['24h', '1h'] },
    fireAt: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'claimed', 'delivered', 'cancelled'],
    },
    claimToken: { type: String, default: '' },
    claimedAt: { type: Date },
  },
  { _id: false },
);

const sessionSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    professionalId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: { type: String, required: true, enum: ['booked', 'cancelled'] },
    reminders: { type: [reminderSchema], default: [] },
  },
  { timestamps: true },
);

sessionSchema.index(
  { professionalId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { status: 'booked' } },
);
sessionSchema.index(
  { memberId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { status: 'booked' } },
);
sessionSchema.index({ 'reminders.status': 1, 'reminders.fireAt': 1 });

export const SessionModel = model('Session', sessionSchema);
