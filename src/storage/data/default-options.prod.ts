import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { Options } from "../types";

dayjs.extend(duration);

export const defaultOptions: Options = {
  minTabs: 7,
  baseLimit: dayjs.duration(24, "hours").asMilliseconds(),
};
