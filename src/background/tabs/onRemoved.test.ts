import {
  getActivatedTabs,
  getClosedTabHistory,
  getOutdatedTabs,
  getValue,
  updateActivatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
  updateStorage,
} from "storage/local";
import { loadOptions } from "storage/sync";
import { ActivatedTabs, ClosedTabsHistory, OutdatedTabs } from "tabs";
import type { Tab } from "types";
import { browser } from "webextension-polyfill-ts";
import { handleTabsOnRemoved } from "./onRemoved";
import { DEFAULT_BROWSER_TAB } from "mocks";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    tabs: { query: jest.fn() },
    alarms: { clear: jest.fn(), getAll: jest.fn() },
  },
}));
const tabsQueryMock = browser.tabs.query as jest.MockedFunction<
  typeof browser.tabs.query
>;
const alarmsClearMock = browser.alarms.clear as jest.MockedFunction<
  typeof browser.alarms.clear
>;
const alarmsGetAllMock = browser.alarms.getAll as jest.MockedFunction<
  typeof browser.alarms.getAll
>;

jest.mock("storage/local");
const getClosedTabHistoryMock = getClosedTabHistory as jest.MockedFunction<
  typeof getClosedTabHistory
>;
const getActivatedTabsMock = getActivatedTabs as jest.MockedFunction<
  typeof getActivatedTabs
>;
const getOutdatedTabsMock = getOutdatedTabs as jest.MockedFunction<
  typeof getOutdatedTabs
>;
const updateClosedTabHistoryMock =
  updateClosedTabHistory as jest.MockedFunction<typeof updateClosedTabHistory>;
const updateActivatedTabsMock = updateActivatedTabs as jest.MockedFunction<
  typeof updateActivatedTabs
>;
const updateOutdatedTabsMock = updateOutdatedTabs as jest.MockedFunction<
  typeof updateOutdatedTabs
>;
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
const getValueMock = getValue as jest.MockedFunction<typeof getValue>;

jest.mock("storage/sync");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

describe("tabs.onRemoved", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    getClosedTabHistoryMock.mockResolvedValue(new ClosedTabsHistory({}, {}));
    getActivatedTabsMock.mockResolvedValue(new ActivatedTabs({}));
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));
    tabsQueryMock.mockResolvedValue([DEFAULT_BROWSER_TAB, DEFAULT_BROWSER_TAB]);
    loadOptionsMock.mockResolvedValue(1); // minTabs
  });

  afterEach(() => {
    tabsQueryMock.mockReset();
    alarmsClearMock.mockReset();
    alarmsGetAllMock.mockReset();
    getClosedTabHistoryMock.mockReset();
    getActivatedTabsMock.mockReset();
    getOutdatedTabsMock.mockReset();
    updateClosedTabHistoryMock.mockReset();
    updateActivatedTabsMock.mockReset();
    updateOutdatedTabsMock.mockReset();
    loadOptionsMock.mockReset();
    updateStorageMock.mockReset();
    getValueMock.mockReset();
  });

  test("the alarm of the tab should be cleared", async () => {
    await handleTabsOnRemoved(1, { windowId: 12, isWindowClosing: false });

    expect(alarmsClearMock).toBeCalledWith("1");
  });

  test("the tab should be added to the history", async () => {
    const tab: Tab = {
      id: 1,
      title: "dummy",
      url: "https://dummy.com",
      favIconUrl: "https://dummy.com/favicon",
      pinned: true, // irrelevant property for the history
    };
    getClosedTabHistoryMock.mockResolvedValue(
      new ClosedTabsHistory({ 12: [tab] }, {})
    );

    await handleTabsOnRemoved(1, { windowId: 12, isWindowClosing: false });

    expect(updateClosedTabHistoryMock).toBeCalledWith(
      new ClosedTabsHistory(
        { 12: [] },
        {
          12: [
            {
              id: tab.id,
              title: tab.title,
              url: tab.url,
              favIconUrl: tab.favIconUrl,
            },
          ],
        }
      )
    );
  });

  test("the tab should be removed from ActivatedTabs", async () => {
    getActivatedTabsMock.mockResolvedValue(
      new ActivatedTabs({ 12: [{ id: 1 }] })
    );

    await handleTabsOnRemoved(1, { windowId: 12, isWindowClosing: false });

    expect(updateActivatedTabsMock).toBeCalledWith(
      new ActivatedTabs({ 12: [] })
    );
  });

  test("the tab should be removed from OutdatedTabs", async () => {
    getOutdatedTabsMock.mockResolvedValue(
      new OutdatedTabs({ 12: [{ id: 1 }] })
    );

    await handleTabsOnRemoved(1, { windowId: 12, isWindowClosing: false });

    expect(updateOutdatedTabsMock).toBeCalledWith(new OutdatedTabs({ 12: [] }));
  });

  test("stops counting down if tabs <= baseLimit", async () => {
    loadOptionsMock.mockResolvedValue(3);
    tabsQueryMock.mockResolvedValue([
      { ...DEFAULT_BROWSER_TAB, id: 2, windowId: 123 },
      { ...DEFAULT_BROWSER_TAB, id: 3, windowId: 123 },
      { ...DEFAULT_BROWSER_TAB, id: 4, windowId: 123 },
    ]);
    const now = 1628599960321;
    jest.setSystemTime(now);
    alarmsGetAllMock.mockResolvedValue([
      { name: "2", scheduledTime: now + 60_000 },
      { name: "3", scheduledTime: now + 120_000 },
      { name: "4", scheduledTime: now + 180_000 },
      { name: "5", scheduledTime: now + 240_000 },
    ]);

    await handleTabsOnRemoved(1, { windowId: 123, isWindowClosing: false });

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(tabsQueryMock).toBeCalledWith({
      windowId: 123,
      windowType: "normal",
    });
    expect(alarmsClearMock).nthCalledWith(1, "1"); // the alarm of the closed tab
    expect(alarmsClearMock).nthCalledWith(2, "2");
    expect(alarmsClearMock).nthCalledWith(3, "3");
    expect(alarmsClearMock).nthCalledWith(4, "4");
    expect(alarmsClearMock).not.toBeCalledWith("5");
    expect(updateStorageMock).toBeCalledWith({
      evacuationMap: {
        123: {
          evacuatedAlarms: [
            { name: "2", scheduledTime: now + 60_000, timeLeft: 60_000 },
            { name: "3", scheduledTime: now + 120_000, timeLeft: 120_000 },
            { name: "4", scheduledTime: now + 180_000, timeLeft: 180_000 },
          ],
        },
      },
    });
  });

  test("do nothing if tabs > baseLimit", async () => {
    loadOptionsMock.mockResolvedValue(3);
    tabsQueryMock.mockResolvedValue([
      { ...DEFAULT_BROWSER_TAB, id: 2, windowId: 123 },
      { ...DEFAULT_BROWSER_TAB, id: 3, windowId: 123 },
      { ...DEFAULT_BROWSER_TAB, id: 4, windowId: 123 },
      { ...DEFAULT_BROWSER_TAB, id: 5, windowId: 123 },
    ]);
    const now = 1628599960321;
    alarmsGetAllMock.mockResolvedValue([
      { name: "2", scheduledTime: now + 60_000 },
      { name: "3", scheduledTime: now + 120_000 },
      { name: "4", scheduledTime: now + 180_000 },
      { name: "5", scheduledTime: now + 240_000 },
    ]);

    await handleTabsOnRemoved(1, { windowId: 123, isWindowClosing: false });

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(alarmsClearMock).not.nthCalledWith(2, "2");
    expect(alarmsClearMock).not.nthCalledWith(3, "3");
    expect(alarmsClearMock).not.nthCalledWith(4, "4");
    expect(alarmsClearMock).not.toBeCalledWith("5");
    expect(updateStorageMock).not.toBeCalled();
  });
});
