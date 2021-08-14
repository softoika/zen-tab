import { DEFAULT_BROWSER_TAB, DEFAULT_CHROME_TAB } from "mocks";
import { loadOptions } from "storage/options";
import {
  getClosedTabHistory,
  getOutdatedTabs,
  updateClosedTabHistory,
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
  },
}));
const tabsQueryMock = browser.tabs.query as jest.MockedFunction<
  typeof browser.tabs.query
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

jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

describe("tabs.onCreated", () => {
  beforeEach(() => {
    tabsQueryMock.mockResolvedValue([]);
    getClosedTabHistoryMock.mockResolvedValue(new ClosedTabsHistory({}, {}));
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));
    loadOptionsMock.mockResolvedValue(0);
  });

  afterEach(() => {
    chromeTabsRemoveMock.mockReset();
    tabsQueryMock.mockReset();
    getClosedTabHistoryMock.mockReset();
    updateClosedTabHistoryMock.mockReset();
    getOutdatedTabsMock.mockReset();
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
    const target = { ...DEFAULT_CHROME_TAB, id: 2, windowId: 123 };

    await handleTabsOnCreated(target);

    expect(loadOptionsMock).toBeCalledWith("minTabs");
    expect(chromeTabsRemoveMock).not.toBeCalled();
  });
});
