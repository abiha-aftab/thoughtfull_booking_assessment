type ShutdownOptions = {
  close: () => Promise<void>;
  disconnect: () => Promise<void>;
  exit: (code: number) => void;
  log: (message: string) => void;
};

export function createShutdown(options: ShutdownOptions): (signal: string) => Promise<void> {
  let shuttingDown = false;

  return async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    options.log(`Shutting down (${signal})`);

    try {
      await options.close();
      await options.disconnect();
      options.exit(0);
    } catch (error) {
      options.log(error instanceof Error ? error.message : 'Shutdown failed');
      options.exit(1);
    }
  };
}
