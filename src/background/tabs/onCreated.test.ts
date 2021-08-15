import { DEFAULT_BROWSER_TAB, DEFAULT_CHROME_TAB } from "mocks";
import { loadOptions } from "storage/options";
import {
  getClosedTabHistory,
  getOutdatedTabs,
  getStorage,
  updateClosedTabHistory,
  updateStorage,
} from "storage/tabs";
import { ClosedTabsHistory, OutdatedTabs } from "tabs";
import { browser } from "webextension-polyfill-ts";
import { handleTabsOnCreated } from "./onCreated";

const chromeTabsRemoveMock = chrome.tabs.remove as jest.MockedFunction<
  typeof chrome.tabs.remove
>;
jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    tabs: { query: jest.fn() },
    alarms: { create: jest.fn() },
  },
}));
const tabsQueryMock = browser.tabs.query as jest.MockedFunction<
  typeof browser.tabs.query
>;
const alarmsCreateMock = browser.alarms.create as jest.MockedFunction<
  typeof browser.alarms.create
>;

jest.mock("storage/tabs");
const getClosedTabHistoryMock = getClosedTabHistory as jest.MockedFunction<
  typeof getClosedTabHistory
>;
const updateClosedTabHistoryMock =
  updateClosedTabHistory as jest.MockedFunction<typeof updateClosedTabHistory>;
const getOutdatedTabsMock = getOutdatedTabs as jest.MockedFunction<
  typeof getOutdatedTabs
>;
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;

jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

describe("tabs.onCreated", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    tabsQueryMock.mockResolvedValue([]);
    getClosedTabHistoryMock.mockResolvedValue(new ClosedTabsHistory({}, {}));
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));
    getStorageMock.mockResolvedValue({});
    loadOptionsMock.mockResolvedValue(0);
  });

  afterEach(() => {
    chromeTabsRemoveMock.mockReset();
    tabsQueryMock.mockReset();
    alarmsCreateMock.mockReset();
    getClosedTabHistoryMock.mockReset();
    updateClosedTabHistoryMock.mockReset();
    getOutdatedTabsMock.mockReset();
    getStorageMock.mockReset();
    updateStorageMock.mockReset();
    loadOptionsMock.mockReset();
  });

  test("saves the tab to storage", async () => {
    const target = { ...DEFAULT_CHROME_TAB, id: 1, windowId: 123 };

    await handleTabsOnCreated(target);

    expect(updateClosedTabHistoryMock).toBeCalledWith(
      new ClosedTabsHistory({ 123: [target] }, {})
    );
  });

  test("removes the outdated tab", async () => {
    tabsQueryMock.mockResolvedValue([
      { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
    ]);
    getOutdatedTabsMock.mockResolvedValue(
      new OutdatedTabs({ 123: [{ id: 1 }] })
    );
    loadOptionsMock.mockResolvedValue(0);
    const target = { ...DEFAULT_CHROME_TAB, id: 2, windowId: 123 };

    await handleTabsOnCreated(target);

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(chromeTabsRemoveMock).toBeCalledWith(1);
  });

  test("does'nt remove the outdated tab if the outdated tabs are empty", async () => {
    tabsQueryMock.mockResolvedValue([
      { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
    ]);
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));
    loadOptionsMock.mockResolvedValue(0);
    const target = { ...DEFAULT_CHROME_TAB, id: 2, windowId: 123 };

    await handleTabsOnCreated(target);

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(chromeTabsRemoveMock).not.toBeCalled();
  });

  test("does'nt remove the outdated tab if tabs <= minTabs", async () => {
    tabsQueryMock.mockResolvedValue([
      { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
    ]);
    getOutdatedTabsMock.mockResolvedValue(
      new OutdatedTabs({ 123: [{ id: 1 }] })
    );
    loadOptionsMock.mockResolvedValue(1);
    const target = { ...DEFAULT_CHROME_TAB, id: 1, windowId: 123 };

    await handleTabsOnCreated(target);

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(chromeTabsRemoveMock).not.toBeCalled();
  });

  test("recovers alarms for the window if tabs > minTabs", async () => {
    tabsQueryMock.mockResolvedValue([
      { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
      { ...DEFAULT_BROWSER_TAB, id: 2, windowId: 123 },
    ]);
    loadOptionsMock.mockResolvedValue(1);
    const now = 1628924465521;
    jest.setSystemTime(now);
    getStorageMock.mockResolvedValue({
      evacuationMap: {
        123: {
          lastEvacuatedAt: now - 60_000,
          evacuatedAlarms: [{ name: "1", scheduledTime: now + 120_000 }],
        },
      },
    });

    await handleTabsOnCreated({ ...DEFAULT_CHROME_TAB, id: 2, windowId: 123 });

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(alarmsCreateMock).toBeCalled();
    expect(updateStorageMock).toBeCalledWith({
      evacuationMap: {
        123: undefined,
      },
      tabsMap: {
        1: { lastInactivated: undefined, scheduledTime: now + 180_000 },
      },
    });
  });
});
