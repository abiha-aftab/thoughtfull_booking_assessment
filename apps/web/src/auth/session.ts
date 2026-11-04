import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiRequest, readSessionUser } from '../api/client';
import { safeNextPath } from './paths';
import { registerRequestBody, type LoginFormValues, type RegisterFormValues } from './schemas';

export const sessionQueryKey = ['session'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async () => {
      try {
        return readSessionUser(await apiRequest('/api/auth/me'));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
}

export function useLogin(nextPath: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (values: LoginFormValues) =>
      readSessionUser(
        await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(values),
        }),
      ),
    onSuccess: (user) => {
      queryClient.setQueryData(sessionQueryKey, user);
      void navigate(safeNextPath(nextPath), { replace: true });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (values: RegisterFormValues) =>
      readSessionUser(
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(registerRequestBody(values)),
        }),
      ),
    onSuccess: (user) => {
      queryClient.setQueryData(sessionQueryKey, user);
      void navigate('/', { replace: true });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => apiRequest('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryKey, null);
      void navigate('/login', { replace: true });
    },
  });
}
