import { DEFAULT_BROWSER_TAB } from "mocks";
import { loadOptions } from "storage/options";
import {
  getOutdatedTabs,
  getStorage,
  updateOutdatedTabs,
  updateStorage,
} from "storage/tabs";
import { OutdatedTabs } from "tabs";
import { browser } from "webextension-polyfill-ts";
import { handleTabsOnActivated } from "./onActivated";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { clear: jest.fn(), create: jest.fn() },
    tabs: { query: jest.fn() },
  },
}));
const alarmsClearMock = browser.alarms.clear as jest.MockedFunction<
  typeof browser.alarms.clear
>;
const alarmsCreateMock = browser.alarms.create as jest.MockedFunction<
  typeof browser.alarms.create
>;
const tabsQueryMock = browser.tabs.query as jest.MockedFunction<
  typeof browser.tabs.query
>;

jest.mock("storage/tabs");
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
const getOutdatedTabsMock = getOutdatedTabs as jest.MockedFunction<
  typeof getOutdatedTabs
>;
const updateOutdatedTabsMock = updateOutdatedTabs as jest.MockedFunction<
  typeof updateOutdatedTabs
>;

jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

describe("tabs.onActivated", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    getStorageMock.mockResolvedValue({});
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));
    loadOptionsMock.mockResolvedValue(0);
    tabsQueryMock.mockResolvedValue([DEFAULT_BROWSER_TAB]);
  });

  afterEach(() => {
    alarmsClearMock.mockReset();
    alarmsCreateMock.mockReset();
    getStorageMock.mockReset();
    updateStorageMock.mockReset();
    getOutdatedTabsMock.mockReset();
    updateOutdatedTabsMock.mockReset();
    loadOptionsMock.mockReset();
    tabsQueryMock.mockReset();
  });

  test("starts counting down the last activated tab", async () => {
    loadOptionsMock.mockReset();
    loadOptionsMock.mockResolvedValueOnce(30 * 60_000);
    loadOptionsMock.mockResolvedValueOnce(0); // minTabs
    getStorageMock.mockResolvedValue({ activatedTabs: { 123: [{ id: 1 }] } });
    const now = 1629507415058;
    jest.setSystemTime(now);

    await handleTabsOnActivated({ tabId: 2, windowId: 123 });
    await Promise.resolve();

    expect(loadOptionsMock).toBeCalledWith("baseLimit");
    expect(alarmsCreateMock).toBeCalledWith("1", { when: now + 30 * 60_000 });
    expect(updateStorageMock).toBeCalledWith({
      tabsMap: {
        1: { lastInactivated: now, scheduledTime: now + 30 * 60_000 },
      },
      activatedTabs: { 123: [{ id: 2 }, { id: 1 }] },
    });
  });

  test("resets the timer of the current tab", async () => {
    getStorageMock.mockResolvedValue({ activatedTabs: { 123: [{ id: 1 }] } });

    await handleTabsOnActivated({ tabId: 2, windowId: 123 });
    await Promise.resolve();

    expect(loadOptionsMock).toBeCalledWith("baseLimit");
    expect(alarmsClearMock).toBeCalledWith("2");
  });

  test("removes the tab from the OutdatedTabs", async () => {
    getOutdatedTabsMock.mockResolvedValue(
      new OutdatedTabs({ 123: [{ id: 2 }] })
    );

    await handleTabsOnActivated({ tabId: 2, windowId: 123 });

    expect(updateOutdatedTabsMock).toBeCalledWith(
      new OutdatedTabs({ 123: [] })
    );
  });
});
