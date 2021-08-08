import dayjs from "dayjs";

export function log(...args: unknown[]) {
  const date = dayjs().format("MM/DD HH:mm:ss.SSS");
  console.log(date, ...args);
}
