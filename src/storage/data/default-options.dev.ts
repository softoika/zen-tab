import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { Options } from "storage/types";

dayjs.extend(duration);

export const defaultOptions: Options = {
  minTabs: 3,
  baseLimit: dayjs.duration(30, "seconds").asMilliseconds(),
};
