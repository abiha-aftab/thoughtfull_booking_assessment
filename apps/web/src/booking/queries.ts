import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockDate,
  bookSession,
  cancelSession,
  fetchAvailability,
  fetchNotifications,
  fetchProfessional,
  fetchProfessionals,
  fetchSchedule,
  fetchSession,
  fetchSessions,
  fetchSlots,
  markAllNotificationsRead,
  markNotificationRead,
  rescheduleSession,
  saveHours,
  unblockDate,
} from '../api/booking';

export function useProfessionals(page: number, search: string) {
  return useQuery({
    queryKey: ['professionals', page, search],
    queryFn: () => fetchProfessionals(page, search),
  });
}

export function useProfessional(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['professional', id],
    queryFn: () => fetchProfessional(id),
    enabled,
  });
}

export function useSlots(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['slots', id],
    queryFn: () => fetchSlots(id),
    enabled,
  });
}

export function useSessions(when: 'upcoming' | 'past') {
  return useQuery({
    queryKey: ['sessions', when],
    queryFn: () => fetchSessions(when),
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: fetchSchedule,
  });
}

export function useSession(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id),
    enabled,
  });
}

export function useAvailability() {
  return useQuery({
    queryKey: ['availability'],
    queryFn: fetchAvailability,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: import.meta.env.MODE === 'test' ? false : 15_000,
  });
}

export function refreshBooking(client: QueryClient): Promise<void> {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['sessions'] }),
    client.invalidateQueries({ queryKey: ['session'] }),
    client.invalidateQueries({ queryKey: ['schedule'] }),
    client.invalidateQueries({ queryKey: ['slots'] }),
    client.invalidateQueries({ queryKey: ['notifications'] }),
  ]).then(() => undefined);
}

export function useBookSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: bookSession,
    onSuccess: (session) => {
      client.setQueryData(['session', session.id], session);
      void refreshBooking(client);
    },
  });
}

export function useCancelSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: cancelSession,
    onSuccess: (session) => {
      client.setQueryData(['session', session.id], session);
      void refreshBooking(client);
    },
  });
}

export function useRescheduleSession(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (startAt: string) => rescheduleSession(id, startAt),
    onSuccess: (session) => {
      client.setQueryData(['session', session.id], session);
      void refreshBooking(client);
    },
  });
}

export function useSaveHours() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveHours,
    onSuccess: (availability) => {
      client.setQueryData(['availability'], availability);
    },
  });
}

export function useBlockDate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: blockDate,
    onSuccess: (availability) => {
      client.setQueryData(['availability'], availability);
    },
  });
}

export function useUnblockDate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: unblockDate,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
