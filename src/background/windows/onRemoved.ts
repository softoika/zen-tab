import { getStorage, updateStorage } from "storage/local";
import { Async } from "types";

type OnRemoved = Parameters<typeof chrome.windows.onRemoved["addListener"]>[0];
type OnRemovedAsync = Async<OnRemoved>;

/**
 * Remove the state related to the window.
 */
export const handleWindowsOnRemoved: OnRemovedAsync = async (windowId) => {
  const { tabs, history, activatedTabs, outdatedTabs, evacuationMap } =
    await getStorage([
      "tabs",
      "history",
      "activatedTabs",
      "outdatedTabs",
      "evacuationMap",
    ]);

  if (tabs) {
    delete tabs[windowId];
  }
  if (history) {
    delete history[windowId];
  }
  if (activatedTabs) {
    delete activatedTabs[windowId];
  }
  if (outdatedTabs) {
    delete outdatedTabs[windowId];
  }
  if (evacuationMap) {
    delete evacuationMap[windowId];
  }

  updateStorage({ tabs, history, activatedTabs, outdatedTabs, evacuationMap });
};
