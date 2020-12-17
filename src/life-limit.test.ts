import type { Storage } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { DEFAULT_TAB } from "./mocks";
import { TabStorageService } from "./tab-storage-service";
import type { Tab } from "./types";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { clear: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("./tab-storage-service");
const tabStorageService = new TabStorageService(
  {} as Storage.LocalStorageArea
) as jest.Mocked<TabStorageService>;

describe("LifeLimit", () => {
  let lifeLimit: LifeLimit;
  beforeEach(() => {
    lifeLimit = new LifeLimit(tabStorageService, browser.alarms);
  });

  afterEach(() => {
    tabStorageService.upateLastTab.mockReset();
    tabStorageService.getLastTab.mockReset();
    (browser.alarms.create as jest.Mock).mockReset();
    (browser.alarms.clear as jest.Mock).mockReset();
  });

  describe(".expireLastTab()", () => {
    test("just update the lastTabId if the current lastTabId is undefined", async (done) => {
      tabStorageService.getLastTab.mockResolvedValue({
        id: undefined,
        windowId: 1,
      });
      const tab = { tabId: 1234, windowId: 1 };
      await lifeLimit.expireLastTab(tab, 0);
      expect(tabStorageService.upateLastTab).toBeCalledWith(tab);
      expect(browser.alarms.clear).toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });

    test("create an alarm with lastTabId and unix timestamp", async (done) => {
      const lastTabId = 111;
      tabStorageService.getLastTab.mockResolvedValue({
        id: lastTabId,
        windowId: 1,
      });
      const tab = { tabId: 1234, windowId: 1 };
      const when = 1605316150185;
      await lifeLimit.expireLastTab(tab, when);
      expect(tabStorageService.upateLastTab).toBeCalledWith(tab);
      expect(browser.alarms.create).toBeCalledWith(`${lastTabId}`, { when });
      done();
    });
  });

  describe(".expireInactiveTabs()", () => {
    test("create alarms for given tabs", async (done) => {
      const tabs: Tab[] = [
        { ...DEFAULT_TAB, id: 1, windowId: 1 },
        { ...DEFAULT_TAB, id: 2, windowId: 1 },
        { ...DEFAULT_TAB, id: 3, windowId: 1 },
      ];
      const when = 1608123162004;
      await lifeLimit.expireInactiveTabs(tabs, when);
      expect(tabStorageService.upateLastTab).toBeCalledWith({
        tabId: 3,
        windowId: 1,
      });
      expect(browser.alarms.create).toBeCalledWith("1", { when });
      expect(browser.alarms.create).toBeCalledWith("2", { when: when + 1000 });
      expect(browser.alarms.create).toBeCalledWith("3", { when: when + 2000 });
      done();
    });

    test("do nothing if the tabs are empty", async (done) => {
      await lifeLimit.expireInactiveTabs([], 0);
      expect(tabStorageService.upateLastTab).not.toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });
  });
});
