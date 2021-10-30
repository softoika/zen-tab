import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { SyncStorage } from "storage/types";

dayjs.extend(duration);

export const defaultOptions: SyncStorage = {
  minTabs: 7,
  baseLimit: dayjs.duration(24, "hours").asMilliseconds(),
  protectPinnedTabs: true,
};
