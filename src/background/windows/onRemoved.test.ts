import { DEFAULT_TAB } from "mocks";
import type { ClosedTab, LocalStorage } from "storage/types";
import { browser } from "webextension-polyfill-ts";
import type { Storage } from "webextension-polyfill-ts";
import { handleWindowsOnRemoved } from "./onRemoved";
import { WindowId } from "types";
import { cache } from "storage/local";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
  },
}));

const DEFAULT_CLOSED_TAB: ClosedTab = {
  id: 1,
  title: "The default closed tab",
  url: "https://dummyurl.com",
};

const localStorage = browser.storage
  .local as jest.Mocked<Storage.LocalStorageArea>;

describe("windows.onRemoved", () => {
  beforeEach(() => {
    localStorage.set.mockReset();
    localStorage.get.mockReset();
    cache.clear();
  });

  test.each<{
    name: string;
    windowId: WindowId;
    mockValue: LocalStorage;
    expected: LocalStorage;
  }>([
    {
      name: "tabs",
      windowId: 1,
      mockValue: { tabs: { 1: [DEFAULT_TAB], 2: [DEFAULT_TAB] } },
      expected: { tabs: { 2: [DEFAULT_TAB] } },
    },
    {
      name: "history",
      windowId: 1,
      mockValue: {
        history: { 1: [DEFAULT_CLOSED_TAB], 2: [DEFAULT_CLOSED_TAB] },
      },
      expected: { history: { 2: [DEFAULT_CLOSED_TAB] } },
    },
    {
      name: "activatedTabs",
      windowId: 1,
      mockValue: { activatedTabs: { 1: [{ id: 1 }], 2: [{ id: 2 }] } },
      expected: { activatedTabs: { 2: [{ id: 2 }] } },
    },
    {
      name: "outdatedTabs",
      windowId: 1,
      mockValue: { outdatedTabs: { 1: [{ id: 1 }], 2: [{ id: 2 }] } },
      expected: { outdatedTabs: { 2: [{ id: 2 }] } },
    },
    {
      name: "evacuationMap",
      windowId: 1,
      mockValue: {
        evacuationMap: {
          1: {
            evacuatedAlarms: [
              {
                name: "1",
                scheduledTime: 1637667191532,
                timeLeft: 30 * 60_000,
              },
            ],
          },
          2: {
            evacuatedAlarms: [
              {
                name: "2",
                scheduledTime: 1637667191532,
                timeLeft: 30 * 60_000,
              },
            ],
          },
        },
      },
      expected: {
        evacuationMap: {
          2: {
            evacuatedAlarms: [
              {
                name: "2",
                scheduledTime: 1637667191532,
                timeLeft: 30 * 60_000,
              },
            ],
          },
        },
      },
    },
  ])(
    "removes $name for the window",
    async ({ windowId, mockValue, expected }) => {
      localStorage.get.mockResolvedValue(mockValue);

      await handleWindowsOnRemoved(windowId);

      expect(localStorage.set).toBeCalledWith(expected);
    }
  );
});
