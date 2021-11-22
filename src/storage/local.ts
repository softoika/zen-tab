import { browser } from "webextension-polyfill-ts";
import { ActivatedTabs, ClosedTabsHistory, OutdatedTabs } from "tabs";
import type { LocalStorage } from "./types";
import { CacheController } from "./cache";
import { log } from "utils";

const storage = () => browser.storage.local;

export const cache = new CacheController<LocalStorage>();

export async function getStorage(): Promise<LocalStorage>;
export async function getStorage<K extends keyof LocalStorage>(
  keys: K[]
): Promise<Pick<LocalStorage, K>>;
export async function getStorage<K extends keyof LocalStorage>(
  keys?: K[]
): Promise<Pick<LocalStorage, K> | LocalStorage> {
  if (!keys) {
    return storage().get();
  }

  const cacheResult = cache.get(keys);
  if (cacheResult.missHitKeys < keys) {
    log("cache hit:", cacheResult.data, "miss hit: ", cacheResult.missHitKeys);
  } else {
    log("miss hit:", cacheResult.missHitKeys);
  }
  let storageResult: LocalStorage = {};
  if (cacheResult.missHitKeys.length > 0) {
    storageResult = await storage().get(cacheResult.missHitKeys);
  }
  return { ...cacheResult.data, ...storageResult };
}

export function updateStorage(value: LocalStorage) {
  cache.put(value);
  storage().set(value);
}

export async function getValue<K extends keyof LocalStorage>(
  key: K
): Promise<LocalStorage[K] | undefined> {
  const result = await getStorage([key]);
  return result[key];
}

export async function getClosedTabHistory(): Promise<ClosedTabsHistory> {
  const { tabs, history } = await getStorage(["tabs", "history"]);
  return new ClosedTabsHistory(tabs ?? {}, history ?? {});
}

export function updateClosedTabHistory(closedTabHistory: ClosedTabsHistory) {
  updateStorage({
    tabs: closedTabHistory.tabs,
    history: closedTabHistory.history,
  });
}

export async function getActivatedTabs(): Promise<ActivatedTabs> {
  const activatedTabs = (await getValue("activatedTabs")) ?? {};
  return new ActivatedTabs(activatedTabs);
}

export function updateActivatedTabs(activatedTabs: ActivatedTabs) {
  updateStorage({ activatedTabs: activatedTabs.value });
}

export async function getOutdatedTabs(): Promise<OutdatedTabs> {
  const outdatedTabs = (await getValue("outdatedTabs")) ?? {};
  return new OutdatedTabs(outdatedTabs);
}

export function updateOutdatedTabs(outdatedTabs: OutdatedTabs) {
  updateStorage({ outdatedTabs: outdatedTabs.value });
}
