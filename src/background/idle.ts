import { getStorage, updateStorage } from "storage/tabs";
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
  updateStorage({ evacuatedAlarms: alarms, lastLockedAt: Date.now() });
  browser.alarms.clearAll();
  log("evacuated alarms: ", alarms);
}

async function recoverAlarms() {
  const storage = await getStorage([
    "evacuatedAlarms",
    "lastLockedAt",
    "tabsMap",
  ]);
  let tabsMap = storage.tabsMap;
  const alarms = storage.evacuatedAlarms ?? [];
  const lastLockedAt = storage.lastLockedAt ?? 0;
  log("recovered alarms:", alarms);
  log("lastLockedAt:", lastLockedAt);
  const diff = lastLockedAt > 0 ? Date.now() - lastLockedAt : 0;
  const threshold = Date.now() + 60_000;

  const toBeRecoverd: Alarms.Alarm[] = alarms.filter(
    (a) => threshold < a.scheduledTime + diff
  );

  // This case should never happen.
  const toBeRemoved: Alarms.Alarm[] = alarms.filter(
    (a) => threshold >= a.scheduledTime + diff
  );
  removeTabOfAlarms(toBeRemoved);

  toBeRecoverd.forEach((a) => {
    browser.alarms.create(a.name, { when: a.scheduledTime + diff });
    const tabId = +a.name;
    tabsMap = {
      ...tabsMap,
      [tabId]: {
        lastInactivated: tabsMap?.[tabId]?.lastInactivated,
        scheduledTime: a.scheduledTime + diff,
      },
    };
  });

  // Clean up the evacuated alarms from storage and update tabsMap
  updateStorage({ evacuatedAlarms: [], tabsMap });
}
