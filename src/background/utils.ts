import type { Alarms } from "webextension-polyfill-ts";

export function isValidAsId(name: Alarms.Alarm["name"]): boolean {
  const id = +name;
  if (isNaN(id)) {
    return false;
  }
  if (!Number.isInteger(id)) {
    return false;
  }
  if (id < 0) {
    return false;
  }
  return true;
}
