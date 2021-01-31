import { browser } from "webextension-polyfill-ts";
import { DEFAULT_TAB } from "mocks";
import { getStorage, updateStorage } from "storage/tabs";
import type { Tab } from "types";
import { loadOptions } from "storage/options";
import { expireInactiveTabs, expireLastTab } from "./lifetime";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { clear: jest.fn(), create: jest.fn() },
    storage: { local: {} },
  },
}));

jest.mock("storage/tabs");
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

describe("LifeLimit", () => {
  afterEach(() => {
    getStorageMock.mockReset();
    updateStorageMock.mockReset();
    loadOptionsMock.mockReset();
    (browser.alarms.create as jest.Mock).mockReset();
    (browser.alarms.clear as jest.Mock).mockReset();
  });

  describe(".expireLastTab()", () => {
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
        tabsMap: { [lastTabId]: { lastInactivated: currentMillis } },
        activatedTabs: { 1: [{ id: 1234 }, { id: 111 }] },
      });
      expect(browser.alarms.create).toBeCalledWith(`${lastTabId}`, {
        when: currentMillis + baseLimit,
      });
      done();
    });
  });

  describe(".expireInactiveTabs()", () => {
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
          1: { lastInactivated: currentMillis },
          2: { lastInactivated: currentMillis },
          3: { lastInactivated: currentMillis },
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
