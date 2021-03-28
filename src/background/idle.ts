import { getValue, updateStorage } from "storage/tabs";
import { log } from "utils";
import type { Alarms } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { removeTabOfAlarms } from "./lifetime";

export async function protectAlarmsOnChangeIdleState(
  state: chrome.idle.IdleState
) {
  if (state === "locked") {
    await evacuateAlarms();
  } else if (state === "active") {
    await recoverAlarms();
  }
}

async function evacuateAlarms() {
  const alarms = await browser.alarms.getAll();
  updateStorage({ evacuatedAlarms: alarms });
  browser.alarms.clearAll();
  log("evacuated alarms: ", alarms);
}

async function recoverAlarms() {
  const alarms = (await getValue("evacuatedAlarms")) ?? [];
  log("recovered alarms:", alarms);
  const threshold = Date.now() + 60_000;

  const toBeRecoverd: Alarms.Alarm[] = alarms.filter(
    (a) => threshold < a.scheduledTime
  );
  const toBeRemoved: Alarms.Alarm[] = alarms.filter(
    (a) => threshold >= a.scheduledTime
  );

  toBeRecoverd.forEach((a) =>
    browser.alarms.create(a.name, { when: a.scheduledTime })
  );
  removeTabOfAlarms(toBeRemoved);

  // Clean up the evacuated alarms from storage
  updateStorage({ evacuatedAlarms: [] });
}
