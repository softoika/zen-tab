import { browser } from "webextension-polyfill-ts";
import { ActivatedTabs, ClosedTabsHistory, OutdatedTabs } from "tabs";
import type { LocalStorage } from "./types";

const storage = () => browser.storage.local;

export function getStorage(): Promise<LocalStorage>;
export function getStorage<K extends keyof LocalStorage>(
  keys: K[]
): Promise<Pick<LocalStorage, K>>;
export function getStorage<K extends keyof LocalStorage>(
  keys?: K[]
): Promise<Pick<LocalStorage, K> | LocalStorage> {
  if (!keys) {
    return storage().get();
  }
  return storage().get(keys);
}

export function updateStorage(value: LocalStorage) {
  storage().set(value);
}

export async function getValue<K extends keyof LocalStorage>(
  key: K
): Promise<LocalStorage[K] | undefined> {
  const result = await storage().get(key);
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
