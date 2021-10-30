import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { SyncStorage } from "storage/types";

dayjs.extend(duration);

export const defaultOptions: SyncStorage = {
  minTabs: 5,
  baseLimit: dayjs.duration(30, "minutes").asMilliseconds(),
  protectPinnedTabs: true,
};
