import { evacuateAlarms, recoverAlarms } from "background/core/evacuation";
import type { Async } from "types";

type OnStateChanged = Parameters<
  typeof chrome.idle.onStateChanged["addListener"]
>[0];
type OnStateChangedAsync = Async<OnStateChanged>;

export const handleIdleOnStateChanged: OnStateChangedAsync = async (state) => {
  if (state === "locked") {
    await evacuateAlarms();
  } else if (state === "active") {
    await recoverAlarms();
  }
};
