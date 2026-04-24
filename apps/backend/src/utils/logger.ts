type LogLevel = 'info' | 'error';

function writeLog(level: LogLevel, event: string, data: Record<string, unknown>): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, data: Record<string, unknown>): void {
  writeLog('info', event, data);
}

export function logError(event: string, data: Record<string, unknown>): void {
  writeLog('error', event, data);
}