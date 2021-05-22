import { browser } from "webextension-polyfill-ts";
import { DEFAULT_BROWSER_TAB, DEFAULT_TAB } from "mocks";
import {
  getOutdatedTabs,
  getStorage,
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

jest.mock("storage/tabs");
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
const getOutdatedTabsMock = getOutdatedTabs as jest.MockedFunction<
  typeof getOutdatedTabs
>;
jest.mock("storage/options");
const updateOutdatedTabsMock = updateOutdatedTabs as jest.MockedFunction<
  typeof updateOutdatedTabs
>;
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

type Alarm = chrome.alarms.Alarm;

describe("lifetime", () => {
  afterEach(() => {
    getStorageMock.mockReset();
    updateStorageMock.mockReset();
    loadOptionsMock.mockReset();
    getOutdatedTabsMock.mockReset();
    updateOutdatedTabsMock.mockReset();
    (browser.alarms.create as jest.Mock).mockReset();
    (browser.alarms.clear as jest.Mock).mockReset();
    (browser.tabs.query as jest.Mock).mockReset();
    (browser.tabs.remove as jest.Mock).mockReset();
    (browser.tabs.get as jest.Mock).mockReset();
  });

  describe("removeTabOnAlarm()", () => {
    test("remove the tab if number of tabs is greater than minTabs option", async (done) => {
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
      done();
    });

    test("push the tab to OutdatedTabs if number of tabs is equals to minTabs or smaller than it", async (done) => {
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
      done();
    });

    test("do nothing if the tabId does not exists", async (done) => {
      const alarm: Alarm = { name: "12", scheduledTime: 1616805413763 };
      tabsGetMock.mockRejectedValue({});

      await removeTabOnAlarm(alarm);

      expect(browser.tabs.query).not.toBeCalled();
      expect(loadOptionsMock).not.toBeCalled();
      expect(browser.tabs.remove).not.toBeCalled();
      expect(updateOutdatedTabsMock).not.toBeCalled();
      done();
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

    test("remove multiple tabs at once", async (done) => {
      tabsQueryMock.mockResolvedValue([
        { ...DEFAULT_BROWSER_TAB, id: 12, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 23, windowId: 1 },
        { ...DEFAULT_BROWSER_TAB, id: 34, windowId: 1 },
      ]);

      await removeTabOfAlarms(alarms);

      expect(browser.tabs.remove).toBeCalledTimes(1);
      expect(browser.tabs.remove).toBeCalledWith([12, 23, 34]);
      done();
    });

    test("remove more tabs than minTabs", async (done) => {
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
      done();
    });

    test("push tabs to outdatedTabs if the number of tabs is minTabs or less", async (done) => {
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
      done();
    });

    test("ignore alarms which the id doesn't exist", async (done) => {
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
      done();
    });

    test("ignore the invalid name of alarms", async (done) => {
      tabsQueryMock.mockResolvedValue([]);

      await removeTabOfAlarms([
        { name: "あ", scheduledTime: 1616893705109 },
        { name: "-1", scheduledTime: 1616893706109 },
        { name: "1.1", scheduledTime: 1616893707109 },
      ]);
      expect(browser.tabs.remove).toBeCalledWith([]);
      done();
    });
  });

  describe("expireLastTab()", () => {
    test("just update the lastTabId if the current lastTabId is undefined", async (done) => {
      getStorageMock.mockResolvedValue({});
      const tab = { tabId: 1234, windowId: 1 };

      await expireLastTab(tab, 0);

      expect(updateStorageMock).toBeCalledWith({
        activatedTabs: { 1: [{ id: 1234 }] },
      });
      expect(browser.alarms.clear).toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });

    test("create an alarm with lastTabId and unix timestamp", async (done) => {
      const lastTabId = 111;
      const baseLimit = 1_800_000;
      getStorageMock.mockResolvedValue({
        activatedTabs: { 1: [{ id: lastTabId }] },
      });
      loadOptionsMock.mockResolvedValue(baseLimit);
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
      done();
    });
  });

  describe("expireInactiveTabs()", () => {
    test("create alarms for given tabs", async (done) => {
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
      done();
    });

    test("do nothing if the tabs are empty", async (done) => {
      await expireInactiveTabs([], 0);
      expect(updateStorageMock).not.toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });
  });
});
