import { browser } from "webextension-polyfill-ts";
import { DEFAULT_BROWSER_TAB, DEFAULT_TAB } from "mocks";
import {
  getOutdatedTabs,
  getStorage,
  getValue,
  updateOutdatedTabs,
  updateStorage,
} from "storage/tabs";
import type { Tab } from "types";
import { loadOptions } from "storage/options";
import {
  expireInactiveTabs,
  expireLastTab,
  removeTabOnAlarm,
  removeTabOfAlarms,
  expireInactiveTab,
} from "./lifetime";
import { OutdatedTabs } from "tabs";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { clear: jest.fn(), create: jest.fn() },
    storage: { local: {} },
    tabs: { query: jest.fn(), remove: jest.fn(), get: jest.fn() },
  },
}));
const tabsQueryMock = browser.tabs.query as jest.MockedFunction<
  typeof browser.tabs.query
>;
const tabsGetMock = browser.tabs.get as jest.MockedFunction<
  typeof browser.tabs.get
>;
const alarmsClearMock = browser.alarms.clear as jest.MockedFunction<
  typeof browser.alarms.clear
>;
const alarmsCreateMock = browser.alarms.create as jest.MockedFunction<
  typeof browser.alarms.create
>;

jest.mock("storage/tabs");
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
const getOutdatedTabsMock = getOutdatedTabs as jest.MockedFunction<
  typeof getOutdatedTabs
>;
const getValueMock = getValue as jest.MockedFunction<typeof getValue>;

jest.mock("storage/options");
const updateOutdatedTabsMock = updateOutdatedTabs as jest.MockedFunction<
  typeof updateOutdatedTabs
>;
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

type Alarm = chrome.alarms.Alarm;

describe("lifetime", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    getStorageMock.mockReset();
    getValueMock.mockReset();
    updateStorageMock.mockReset();
    loadOptionsMock.mockReset();
    getOutdatedTabsMock.mockReset();
    updateOutdatedTabsMock.mockReset();
    alarmsClearMock.mockReset();
    alarmsCreateMock.mockReset();
    (browser.tabs.query as jest.Mock).mockReset();
    (browser.tabs.remove as jest.Mock).mockReset();
    (browser.tabs.get as jest.Mock).mockReset();
  });

  describe("removeTabOnAlarm()", () => {
    test("removes the tab if number of tabs is greater than minTabs option", async () => {
      const alarm: Alarm = { name: "12", scheduledTime: 1616805413763 };
      tabsGetMock.mockResolvedValue({
        ...DEFAULT_BROWSER_TAB,
        id: 12,
        windowId: 1,
      });
      tabsQueryMock.mockResolvedValue([
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
      ]);
      loadOptionsMock.mockResolvedValue(2);

      await removeTabOnAlarm(alarm);

      expect(browser.tabs.remove).toBeCalledWith(12);
    });

    test("pushes the tab to OutdatedTabs if number of tabs is equals to minTabs or smaller than it", async () => {
      const alarm: Alarm = { name: "12", scheduledTime: 1616805413763 };
      tabsGetMock.mockResolvedValue({
        ...DEFAULT_BROWSER_TAB,
        id: 12,
        windowId: 1,
      });
      tabsQueryMock.mockResolvedValue([
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
      ]);
      loadOptionsMock.mockResolvedValue(3);
      getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));

      await removeTabOnAlarm(alarm);

      expect(browser.tabs.query).toBeCalledWith({
        windowId: 1,
        windowType: "normal",
      });
      expect(browser.tabs.remove).not.toBeCalled();
      expect(updateOutdatedTabsMock).toBeCalled();
    });

    test("does nothing if the tab is pinned and the protectPinnedTabs option is enabled", async () => {
      const alarm: Alarm = { name: "12", scheduledTime: 1616805413763 };
      tabsGetMock.mockResolvedValue({
        ...DEFAULT_BROWSER_TAB,
        id: 12,
        windowId: 1,
        pinned: true,
      });
      tabsQueryMock.mockResolvedValue([
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
      ]);
      loadOptionsMock.mockResolvedValueOnce(2); // minTabs
      loadOptionsMock.mockResolvedValueOnce(true); // protectPinnedTabs
      getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));

      await removeTabOnAlarm(alarm);

      expect(browser.tabs.query).toBeCalledWith({
        windowId: 1,
        windowType: "normal",
      });
      expect(browser.tabs.remove).not.toBeCalled();
      expect(updateOutdatedTabsMock).not.toBeCalled();
    });

    test("removes the tab if the tab is pinned and the protectPinnedTabs option is disabled", async () => {
      const alarm: Alarm = { name: "12", scheduledTime: 1616805413763 };
      tabsGetMock.mockResolvedValue({
        ...DEFAULT_BROWSER_TAB,
        id: 12,
        windowId: 1,
        pinned: true,
      });
      tabsQueryMock.mockResolvedValue([
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
      ]);
      loadOptionsMock.mockResolvedValueOnce(2); // minTabs
      loadOptionsMock.mockResolvedValueOnce(false); // protectPinnedTabs
      getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));

      await removeTabOnAlarm(alarm);

      expect(browser.tabs.query).toBeCalledWith({
        windowId: 1,
        windowType: "normal",
      });
      expect(browser.tabs.remove).toBeCalled();
      expect(updateOutdatedTabsMock).not.toBeCalled();
    });

    test("does nothing if the tabId does not exists", async () => {
      const alarm: Alarm = { name: "12", scheduledTime: 1616805413763 };
      tabsGetMock.mockRejectedValue({});

      await removeTabOnAlarm(alarm);

      expect(browser.tabs.query).not.toBeCalled();
      expect(loadOptionsMock).not.toBeCalled();
      expect(browser.tabs.remove).not.toBeCalled();
      expect(updateOutdatedTabsMock).not.toBeCalled();
    });
  });

  describe("removeTabOfAlarms()", () => {
    const alarms: Alarm[] = [
      { name: "12", scheduledTime: 1616893705109 },
      { name: "23", scheduledTime: 1616893706109 },
      { name: "34", scheduledTime: 1616893707109 },
    ];

    beforeEach(() => {
      loadOptionsMock.mockResolvedValue(0);
      getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));
    });

    test("removes multiple tabs at once", async () => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 1 },
      ]);

      await removeTabOfAlarms(alarms);

      expect(browser.tabs.remove).toBeCalledTimes(1);
      expect(browser.tabs.remove).toBeCalledWith([12, 23, 34]);
    });

    test("removes more tabs than minTabs", async () => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 2 },
      ]);
      loadOptionsMock.mockResolvedValue(1);

      await removeTabOfAlarms(alarms);

      expect(tabsQueryMock).toBeCalledWith({
        windowType: "normal",
      });
      expect(loadOptionsMock).toBeCalledWith("minTabs");
      expect(browser.tabs.remove).toBeCalledWith([12]);
      expect(updateOutdatedTabsMock).toBeCalledWith(
        new OutdatedTabs({ 1: [{ id: 23 }], 2: [{ id: 34 }] })
      );
    });

    test("pushes tabs to outdatedTabs if the number of tabs is minTabs or less", async () => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 2 },
      ]);
      loadOptionsMock.mockResolvedValue(2);

      await removeTabOfAlarms(alarms);

      expect(updateOutdatedTabsMock).toBeCalledWith(
        new OutdatedTabs({ 1: [{ id: 12 }, { id: 23 }], 2: [{ id: 34 }] })
      );
    });

    test("doesn't remove pinned tabs if the protectPinnedTabs option is enabled", async () => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1, pinned: true },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1, pinned: false },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 2, pinned: true },
      ]);
      loadOptionsMock.mockResolvedValueOnce(1); // minTabs
      loadOptionsMock.mockResolvedValueOnce(true); // protectPinnedTabs

      await removeTabOfAlarms(alarms);

      expect(browser.tabs.remove).toBeCalledWith([23]);
      expect(updateOutdatedTabsMock).toBeCalledWith(new OutdatedTabs({}));
    });

    test("removes pinned tabs if the protectPinnedTabs option is disabled", async () => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1, pinned: true },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1, pinned: false },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 2, pinned: true },
      ]);
      loadOptionsMock.mockResolvedValueOnce(1); // minTabs
      loadOptionsMock.mockResolvedValueOnce(false); // protectPinnedTabs

      await removeTabOfAlarms(alarms);

      expect(browser.tabs.remove).toBeCalledWith([12]);
      expect(updateOutdatedTabsMock).toBeCalledWith(
        new OutdatedTabs({ 1: [{ id: 23 }], 2: [{ id: 34 }] })
      );
    });

    test("ignores alarms which the id doesn't exist", async () => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 2 },
      ]);

      await removeTabOfAlarms([
        { name: "1", scheduledTime: 1616893705109 },
        { name: "2", scheduledTime: 1616893706109 },
        { name: "3", scheduledTime: 1616893707109 },
      ]);

      expect(browser.tabs.remove).toBeCalledWith([]);
    });

    test("ignores the invalid name of alarms", async () => {
      tabsQueryMock.mockResolvedValue([]);

      await removeTabOfAlarms([
        { name: "あ", scheduledTime: 1616893705109 },
        { name: "-1", scheduledTime: 1616893706109 },
        { name: "1.1", scheduledTime: 1616893707109 },
      ]);
      expect(browser.tabs.remove).toBeCalledWith([]);
    });
  });

  describe("expireLastTab()", () => {
    test("just updates the lastTabId if the current lastTabId is undefined", async () => {
      const baseLimit = 1_800_000;
      const minTabs = 2;
      tabsQueryMock.mockResolvedValue([
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
        DEFAULT_BROWSER_TAB,
      ]);
      loadOptionsMock.mockResolvedValueOnce(baseLimit);
      loadOptionsMock.mockResolvedValueOnce(minTabs);
      getStorageMock.mockResolvedValue({});
      const tab = { tabId: 1234, windowId: 1 };

      await expireLastTab(tab, 0);

      expect(updateStorageMock).toBeCalledWith({
        activatedTabs: { 1: [{ id: 1234 }] },
      });
      expect(browser.alarms.clear).toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
    });

    test("creates an alarm with lastTabId and unix timestamp", async () => {
      const lastTabId = 111;
      const baseLimit = 1_800_000;
      const minTabs = 2;
      const tabs = [
        { ...DEFAULT_BROWSER_TAB, id: 1234, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 111, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 456, windowId: 1 },
      ];
      loadOptionsMock.mockResolvedValueOnce(baseLimit);
      loadOptionsMock.mockResolvedValueOnce(minTabs);
      tabsQueryMock.mockResolvedValue(tabs);
      getStorageMock.mockResolvedValue({
        activatedTabs: { 1: [{ id: lastTabId }] },
      });
      const tab = { tabId: 1234, windowId: 1 };
      const currentMillis = 1605316150185;

      await expireLastTab(tab, currentMillis);

      expect(updateStorageMock).toBeCalledWith({
        tabsMap: {
          [lastTabId]: {
            lastInactivated: currentMillis,
            scheduledTime: currentMillis + baseLimit,
          },
        },
        activatedTabs: { 1: [{ id: 1234 }, { id: 111 }] },
      });
      expect(browser.alarms.create).toBeCalledWith(`${lastTabId}`, {
        when: currentMillis + baseLimit,
      });
    });

    test("evacuates the last tab instead of removing if tabs <= minTabs", async () => {
      const lastTabId = 111;
      const baseLimit = 1_800_000;
      const minTabs = 2;
      const tabs = [
        { ...DEFAULT_BROWSER_TAB, id: 1234, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 111, windowId: 1 },
      ];
      const tab = { tabId: 1234, windowId: 1 };
      const currentMillis = 1605316150185;
      jest.setSystemTime(currentMillis);
      getStorageMock.mockResolvedValue({
        activatedTabs: { 1: [{ id: lastTabId }] },
      });
      tabsQueryMock.mockResolvedValue(tabs);
      loadOptionsMock.mockResolvedValueOnce(baseLimit);
      loadOptionsMock.mockResolvedValueOnce(minTabs);
      getValueMock.mockResolvedValue({ 1: { evacuatedAlarms: [] } });

      await expireLastTab(tab, currentMillis);

      expect(tabsQueryMock).toBeCalledWith({
        windowId: 1,
        windowType: "normal",
      });
      expect(loadOptionsMock).toBeCalledWith("minTabs");
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          1: {
            evacuatedAlarms: [
              {
                name: `${lastTabId}`,
                scheduledTime: currentMillis + baseLimit,
                timeLeft: baseLimit,
              },
            ],
          },
        },
      });
      expect(updateStorageMock).toBeCalledWith({
        tabsMap: {
          [lastTabId]: {
            lastInactivated: currentMillis,
            scheduledTime: currentMillis + baseLimit,
          },
        },
        activatedTabs: { 1: [{ id: 1234 }, { id: 111 }] },
      });
      expect(browser.alarms.create).not.toBeCalled();
    });

    test("removes the alarm from the evacuationMap if tabs <= minTabs", async () => {
      const baseLimit = 1_800_000;
      const minTabs = 2;
      const tabs = [
        { ...DEFAULT_BROWSER_TAB, id: 1234, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 111, windowId: 1 },
      ];
      const tab = { tabId: 1234, windowId: 1 };
      const currentMillis = 1605316150185;
      jest.setSystemTime(currentMillis);
      tabsQueryMock.mockResolvedValue(tabs);
      loadOptionsMock.mockResolvedValueOnce(baseLimit);
      loadOptionsMock.mockResolvedValueOnce(minTabs);
      getStorageMock.mockResolvedValue({});
      getValueMock.mockResolvedValue({
        1: {
          evacuatedAlarms: [
            {
              name: "1234",
              scheduledTime: currentMillis + 30 * 60_000,
              timeLeft: 30 * 60_000,
            },
          ],
        },
      });

      await expireLastTab(tab, currentMillis);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(updateStorageMock).nthCalledWith(1, {
        evacuationMap: { 1: { evacuatedAlarms: [] } },
      });
    });
  });

  describe("expireInactiveTabs()", () => {
    test("creates alarms for given tabs", async () => {
      const tabs: Tab[] = [
        { ...DEFAULT_TAB, id: 1, windowId: 1, active: false },
        { ...DEFAULT_TAB, id: 2, windowId: 1, active: false },
        { ...DEFAULT_TAB, id: 3, windowId: 1, active: false },
        { ...DEFAULT_TAB, id: 4, windowId: 1, active: true },
      ];
      const currentMillis = 1608123162004;
      const baseLimit = 1_800_000;
      loadOptionsMock.mockResolvedValue(baseLimit);

      await expireInactiveTabs(tabs, currentMillis);

      expect(browser.alarms.create).toBeCalledWith("1", {
        when: currentMillis + baseLimit,
      });
      expect(browser.alarms.create).toBeCalledWith("2", {
        when: currentMillis + baseLimit + 1000,
      });
      expect(browser.alarms.create).toBeCalledWith("3", {
        when: currentMillis + baseLimit + 2000,
      });
      expect(updateStorageMock).toBeCalled();
      expect(updateStorageMock).toBeCalledWith({
        activatedTabs: {
          1: [{ id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }],
        },
        tabsMap: {
          1: {
            lastInactivated: currentMillis,
            scheduledTime: currentMillis + baseLimit,
          },
          2: {
            lastInactivated: currentMillis,
            scheduledTime: currentMillis + baseLimit,
          },
          3: {
            lastInactivated: currentMillis,
            scheduledTime: currentMillis + baseLimit,
          },
        },
      });
    });

    test("does nothing if the tabs are empty", async () => {
      await expireInactiveTabs([], 0);
      expect(updateStorageMock).not.toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
    });
  });

  describe("expireInactiveTab()", () => {
    beforeEach(() => {
      getValueMock.mockResolvedValue({});
      loadOptionsMock.mockResolvedValue(0);
    });

    test("creates an alarm for the tab", async () => {
      const baseLimit = 30 * 60_000;
      loadOptionsMock.mockResolvedValue(baseLimit);
      const tab: Tab = { ...DEFAULT_TAB, id: 1, active: false };
      const now = 1629199760981;

      await expireInactiveTab(tab, now);

      expect(loadOptionsMock).toBeCalledWith("baseLimit");
      expect(getValueMock).toBeCalledWith("tabsMap");
      expect(alarmsCreateMock).toBeCalledWith("1", { when: now + baseLimit });
    });

    test("updates the tabsMap", async () => {
      const baseLimit = 30 * 60_000;
      loadOptionsMock.mockResolvedValue(baseLimit);
      const tab: Tab = { ...DEFAULT_TAB, id: 1, active: false };
      const now = 1629199760981;

      await expireInactiveTab(tab, now);

      expect(updateStorageMock).toBeCalledWith({
        tabsMap: {
          1: { lastInactivated: now, scheduledTime: now + baseLimit },
        },
      });
    });

    test("does nothing if the tab is active", async () => {
      const tab: Tab = { ...DEFAULT_TAB, id: 1, active: true };
      const now = 1629199760981;

      await expireInactiveTab(tab, now);

      expect(alarmsCreateMock).not.toBeCalled();
      expect(alarmsClearMock).not.toBeCalled();
      expect(updateStorageMock).not.toBeCalled();
    });
  });
});
