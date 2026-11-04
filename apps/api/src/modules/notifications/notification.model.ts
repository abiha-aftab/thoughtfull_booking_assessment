import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    reminderId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    kind: { type: String, required: true, enum: ['24h', '1h'] },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = model('Notification', notificationSchema);
