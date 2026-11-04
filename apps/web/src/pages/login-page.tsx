import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import { safeNextPath } from '../auth/paths';
import { loginFormSchema, type LoginFormValues } from '../auth/schemas';
import { useLogin } from '../auth/session';
import { AuthLayout } from '../components/auth-layout';
import { FormError, applyServerIssues, errorMessage } from '../components/form-error';
import { TextField } from '../components/text-field';

function nextFromState(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return '/';
  }
  return safeNextPath(state.from);
}

export function LoginPage() {
  const location = useLocation();
  const login = useLogin(nextFromState(location.state));
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <AuthLayout title="Sign in" lede="Pick up your sessions in the timezone saved on your account.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void form.handleSubmit(async (values) => {
            try {
              await login.mutateAsync(values);
            } catch (error: unknown) {
              applyServerIssues(error, form.setError, ['email', 'password']);
            }
          })(event);
        }}
        noValidate
      >
        <FormError message={login.isError ? errorMessage(login.error) : null} />
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-paper shadow-[0_8px_24px_rgb(61_207_155_/_0.2)] hover:bg-pine-dark disabled:opacity-60"
          disabled={login.isPending}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-mist">
        New here?{' '}
        <Link to="/register" className="font-semibold text-pine">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
