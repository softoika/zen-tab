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
    tabStorageService.upateLastTabId.mockReset();
    tabStorageService.getLastTabId.mockReset();
    (browser.alarms.create as jest.Mock).mockReset();
    (browser.alarms.clear as jest.Mock).mockReset();
  });

  describe(".expireLastTab()", () => {
    test("just update the lastTabId if the current lastTabId is undefined", async (done) => {
      tabStorageService.getLastTabId.mockResolvedValue(undefined);
      const tabId = 1234;
      await lifeLimit.expireLastTab(tabId, 0);
      expect(tabStorageService.upateLastTabId).toBeCalledWith(tabId);
      expect(browser.alarms.clear).toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });

    test("create an alarm with lastTabId and unix timestamp", async (done) => {
      const lastTabId = 111;
      tabStorageService.getLastTabId.mockResolvedValue(lastTabId);
      const tabId = 1234;
      const when = 1605316150185;
      await lifeLimit.expireLastTab(tabId, when);
      expect(tabStorageService.upateLastTabId).toBeCalledWith(tabId);
      expect(browser.alarms.create).toBeCalledWith(`${lastTabId}`, { when });
      done();
    });

    test("do nothing if the provided tabId is undefined", async (done) => {
      await lifeLimit.expireLastTab(undefined, 0);
      expect(tabStorageService.upateLastTabId).not.toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });
  });

  describe(".expireInactiveTabs()", () => {
    test("create alarms for given tabs", async (done) => {
      const tabs: Tab[] = [
        { ...DEFAULT_TAB, id: 1 },
        { ...DEFAULT_TAB, id: 2 },
        { ...DEFAULT_TAB, id: 3 },
      ];
      const when = 1608123162004;
      await lifeLimit.expireInactiveTabs(tabs, when);
      expect(tabStorageService.upateLastTabId).toBeCalledWith(3);
      expect(browser.alarms.create).toBeCalledWith("1", { when });
      expect(browser.alarms.create).toBeCalledWith("2", { when: when + 1000 });
      expect(browser.alarms.create).toBeCalledWith("3", { when: when + 2000 });
      done();
    });

    test("do nothing if the tabs are empty", async (done) => {
      await lifeLimit.expireInactiveTabs([], 0);
      expect(tabStorageService.upateLastTabId).not.toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });
  });
});
