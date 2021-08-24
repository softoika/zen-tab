import { isValidAsId } from "background/utils";
import { loadOptions } from "storage/options";
import { updateStorage, getStorage, getValue } from "storage/tabs";
import type { TabStorage } from "storage/types";
import type { NotNull, WindowId } from "types";
import { log } from "utils";
import type { Alarms } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { removeTabOfAlarms } from "./lifetime";

export async function evacuateAlarms(): Promise<void>;
export async function evacuateAlarms(windowId: WindowId): Promise<void>;

export async function evacuateAlarms(windowId?: WindowId) {
  if (windowId === undefined) {
    await evacuateAlarmsOfAllWindows();
  } else {
    await evacuateAlarmsOfWindow(windowId);
  }
}

export async function recoverAlarms(): Promise<void>;
export async function recoverAlarms(windowId: WindowId): Promise<void>;

export async function recoverAlarms(windowId?: WindowId) {
  if (windowId === undefined) {
    await recoverAlarmsOfAllWindows();
  } else {
    await recoverAlarmsOfWindow(windowId);
  }
}

async function evacuateAlarmsOfAllWindows() {
  const alarms = await browser.alarms.getAll();
  updateStorage({ evacuatedAlarms: alarms, lastEvacuatedAt: Date.now() });
  browser.alarms.clearAll();
  log("evacuated alarms: ", alarms);
}

async function evacuateAlarmsOfWindow(windowId: WindowId) {
  const [tabs, minTabs, allAlarms, _evacuationMap] = await Promise.all([
    browser.tabs.query({ windowId, windowType: "normal" }),
    loadOptions("minTabs"),
    browser.alarms.getAll(),
    getValue("evacuationMap"),
  ]);

  if (tabs.length > minTabs) {
    return;
  }

  const tabIds = new Set(
    tabs.filter((tab) => tab.id).map((tab) => `${tab.id}`)
  );
  const targetAlarms = allAlarms.filter((alarm) => tabIds.has(alarm.name));
  const alarmNamesSet = new Set(targetAlarms.map((alarm) => alarm.name));
  let evacuationMap = _evacuationMap ?? {};
  let evacuatedAlarms = evacuationMap[windowId]?.evacuatedAlarms ?? [];
  evacuatedAlarms = evacuatedAlarms.filter(
    (alarm) => !alarmNamesSet.has(alarm.name)
  );
  evacuationMap = {
    ...evacuationMap,
    [windowId]: {
      lastEvacuatedAt: Date.now(),
      evacuatedAlarms: [...evacuatedAlarms, ...targetAlarms],
    },
  };

  updateStorage({ evacuationMap });
  targetAlarms.map((alarm) => browser.alarms.clear(alarm.name));
  log(`evacuated alarms(windowId: ${windowId})`, targetAlarms);
}

async function recoverAlarmsOfAllWindows() {
  const storage = await getStorage([
    "evacuatedAlarms",
    "lastEvacuatedAt",
    "tabsMap",
  ]);
  let tabsMap = storage.tabsMap ?? {};
  const alarms = storage.evacuatedAlarms ?? [];
  const lastEvacuatedAt = storage.lastEvacuatedAt ?? 0;
  tabsMap = _recoverAlarms(alarms, lastEvacuatedAt, tabsMap);

  // Clean up the evacuated alarms from storage and update tabsMap
  updateStorage({ evacuatedAlarms: [], tabsMap, lastEvacuatedAt: undefined });
}

async function recoverAlarmsOfWindow(windowId: WindowId) {
  const storage = await getStorage(["evacuationMap", "tabsMap"]);
  let evacuationMap = storage.evacuationMap ?? {};
  let tabsMap = storage.tabsMap ?? {};
  const target = evacuationMap[windowId];
  if (!target) {
    log(
      `Alarms of the target window(windowId: ${windowId}) does not exist.`,
      target
    );
    return;
  }
  tabsMap = _recoverAlarms(
    target.evacuatedAlarms,
    target.lastEvacuatedAt,
    tabsMap
  );
  evacuationMap = {
    ...evacuationMap,
    [windowId]: undefined,
  };

  updateStorage({ evacuationMap, tabsMap });
}

type Alarms = readonly Alarms.Alarm[];
type LastEvacuatedAt = TabStorage["lastEvacuatedAt"];
type TabsMap = NotNull<TabStorage["tabsMap"]>;

function _recoverAlarms(
  alarms: Alarms,
  lastEvacuatedAt: LastEvacuatedAt,
  tabsMap: TabsMap
): TabsMap {
  log("recovered alarms:", alarms);
  log("lastEvacuatedAt:", lastEvacuatedAt);
  if (lastEvacuatedAt === undefined) {
    return tabsMap;
  }
  const diff = lastEvacuatedAt > 0 ? Date.now() - lastEvacuatedAt : 0;
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
    if (!isValidAsId(a.name)) {
      return;
    }
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

  return tabsMap;
}
