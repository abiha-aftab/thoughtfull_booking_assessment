import { describe, expect, it, vi } from 'vitest';
import { createShutdown } from './shutdown';

describe('createShutdown', () => {
  it('closes the server once when shutdown is requested twice', async () => {
    const close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const disconnect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const exit = vi.fn<(code: number) => void>();
    const shutdown = createShutdown({
      close,
      disconnect,
      exit,
      log: () => undefined,
    });

    await Promise.all([shutdown('SIGINT'), shutdown('SIGTERM')]);

    expect(close).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits with a failure when closing the server throws', async () => {
    const exit = vi.fn<(code: number) => void>();
    const shutdown = createShutdown({
      close: () => Promise.reject(new Error('close failed')),
      disconnect: () => Promise.resolve(),
      exit,
      log: () => undefined,
    });

    await shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledWith(1);
  });
});
