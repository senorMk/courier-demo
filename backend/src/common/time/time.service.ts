import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";

export type TimeInput = Date | string | number;

@Injectable()
export class TimeService {
  private readonly zone = "Africa/Lusaka"; // Zambia observes SAST (UTC+2)

  now(): Date {
    return this.currentDateTime().toUTC().toJSDate();
  }

  nowISO(): string {
    return this.currentDateTime().toISO({ suppressMilliseconds: true });
  }

  toDate(value: TimeInput): Date {
    return this.ensureValid(this.toDateTime(value), value).toUTC().toJSDate();
  }

  toISO(value: TimeInput, options: { asUTC?: boolean } = {}): string {
    const dateTime = this.ensureValid(this.toDateTime(value), value);
    const target = options.asUTC ? dateTime.toUTC() : dateTime;
    return target.toISO({ suppressMilliseconds: true });
  }

  add(value: TimeInput, duration: Partial<Record<"days" | "hours" | "minutes" | "seconds" | "milliseconds", number>>): Date {
    return this.ensureValid(this.toDateTime(value), value)
      .plus(duration)
      .toUTC()
      .toJSDate();
  }

  addDays(value: TimeInput, days: number): Date {
    return this.add(value, { days });
  }

  addHours(value: TimeInput, hours: number): Date {
    return this.add(value, { hours });
  }

  format(value: TimeInput, fmt = "dd/LL/yyyy HH:mm"): string {
    return this.ensureValid(this.toDateTime(value), value).toFormat(fmt);
  }

  parse(value: string): Date {
    return this.ensureValid(this.toDateTime(value), value).toUTC().toJSDate();
  }

  startOfDay(value: TimeInput): Date {
    return this.ensureValid(this.toDateTime(value), value).startOf("day").toUTC().toJSDate();
  }

  endOfDay(value: TimeInput): Date {
    return this.ensureValid(this.toDateTime(value), value).endOf("day").toUTC().toJSDate();
  }

  private currentDateTime(): DateTime {
    return DateTime.now().setZone(this.zone);
  }

  private toDateTime(value: TimeInput): DateTime {
    if (value instanceof Date) {
      return DateTime.fromJSDate(value, { zone: this.zone });
    }

    if (typeof value === "number") {
      return DateTime.fromMillis(value, { zone: this.zone });
    }

    // Strings could be ISO or other representations
    const iso = DateTime.fromISO(value, { zone: this.zone, setZone: true });
    if (iso.isValid) {
      return iso;
    }

    const rfc = DateTime.fromRFC2822(value, { zone: this.zone });
    if (rfc.isValid) {
      return rfc;
    }

    // Fallback to JS Date parsing (may be NaN if invalid)
    return DateTime.fromJSDate(new Date(value), { zone: this.zone });
  }

  private ensureValid(dateTime: DateTime, original: TimeInput): DateTime {
    if (!dateTime.isValid) {
      throw new Error(`Invalid date input: ${original}`);
    }
    return dateTime;
  }
}
