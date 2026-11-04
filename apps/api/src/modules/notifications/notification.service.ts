import type { NotificationDto } from '@thoughtfull/shared';
import { AppError } from '../../common/errors/app-error';
import { toNotificationDto } from './delivery';
import { NotificationModel } from './notification.model';

function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export async function listNotifications(userId: string): Promise<NotificationDto[]> {
  const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1, _id: -1 });
  return docs.flatMap((doc) => {
    const dto = toNotificationDto(doc);
    return dto ? [dto] : [];
  });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
  now = new Date(),
): Promise<NotificationDto> {
  if (!isObjectId(notificationId)) {
    throw new AppError(404, 'not_found', 'Notification not found');
  }
  const existing = await NotificationModel.findOne({ _id: notificationId, userId });
  if (!existing) {
    throw new AppError(404, 'not_found', 'Notification not found');
  }
  if (!existing.readAt) {
    existing.readAt = now;
    await existing.save();
  }
  const dto = toNotificationDto(existing);
  if (!dto) {
    throw new AppError(500, 'internal_error', 'Something went wrong');
  }
  return dto;
}

export async function markAllNotificationsRead(userId: string, now = new Date()): Promise<void> {
  await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: now } });
}
