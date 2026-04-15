type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cachedFormatter = dateTimeFormatterCache.get(timeZone);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  dateTimeFormatterCache.set(timeZone, formatter);
  return formatter;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function parseIsoDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);

  return {
    year,
    month,
    day,
  };
}

export function addDaysToIsoDate(date: string, days: number): string {
  const { year, month, day } = parseIsoDate(date);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));

  return `${nextDate.getUTCFullYear()}-${pad(nextDate.getUTCMonth() + 1)}-${pad(nextDate.getUTCDate())}`;
}

export function getIsoDateInTimeZone(value: Date, timeZone: string): string {
  const parts = getZonedDateParts(value, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getWeekdayForIsoDate(date: string): number {
  const { year, month, day } = parseIsoDate(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return (weekday + 6) % 7;
}

export function getZonedDateParts(value: Date, timeZone: string): ZonedDateParts {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(value);

  const readPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type)?.value;
    return Number(part);
  };

  return {
    year: readPart('year'),
    month: readPart('month'),
    day: readPart('day'),
    hour: readPart('hour'),
    minute: readPart('minute'),
    second: readPart('second'),
  };
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const { year, month, day } = parseIsoDate(date);
  const [hour, minute] = time.split(':').map(Number);
  const targetUtcValue = Date.UTC(year, month - 1, day, hour, minute, 0);

  let guess = new Date(targetUtcValue);

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const zonedValue = getZonedDateParts(guess, timeZone);
    const zonedUtcValue = Date.UTC(
      zonedValue.year,
      zonedValue.month - 1,
      zonedValue.day,
      zonedValue.hour,
      zonedValue.minute,
      zonedValue.second,
    );
    const diffMs = zonedUtcValue - targetUtcValue;

    if (diffMs === 0) {
      return guess;
    }

    guess = new Date(guess.getTime() - diffMs);
  }

  return guess;
}

export function formatTimeInTimeZone(value: Date, timeZone: string): string {
  const parts = getZonedDateParts(value, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function getDayBoundsInTimeZone(date: string, timeZone: string): { startsAt: Date; endsAt: Date } {
  return {
    startsAt: zonedDateTimeToUtc(date, '00:00', timeZone),
    endsAt: zonedDateTimeToUtc(addDaysToIsoDate(date, 1), '00:00', timeZone),
  };
}