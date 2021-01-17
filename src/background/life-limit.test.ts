import { browser } from "webextension-polyfill-ts";
import { LifeLimit } from "./life-limit";
import { DEFAULT_TAB } from "mocks";
import { getActivatedTabs, updateActivatedTabs } from "storage/tabs";
import { ActivatedTabs } from "tabs";
import type { Tab } from "types";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { clear: jest.fn(), create: jest.fn() },
    storage: { local: {} },
  },
}));

jest.mock("../storage/tabs");
const getActivatedTabsMock = getActivatedTabs as jest.MockedFunction<
  typeof getActivatedTabs
>;
const updateActivatedTabsMock = updateActivatedTabs as jest.MockedFunction<
  typeof updateActivatedTabs
>;

describe("LifeLimit", () => {
  let lifeLimit: LifeLimit;
  beforeEach(() => {
    lifeLimit = new LifeLimit(browser.alarms);
  });

  afterEach(() => {
    getActivatedTabsMock.mockReset();
    updateActivatedTabsMock.mockReset();
    (browser.alarms.create as jest.Mock).mockReset();
    (browser.alarms.clear as jest.Mock).mockReset();
  });

  describe(".expireLastTab()", () => {
    test("just update the lastTabId if the current lastTabId is undefined", async (done) => {
      getActivatedTabsMock.mockResolvedValue(new ActivatedTabs({}));
      const tab = { tabId: 1234, windowId: 1 };
      await lifeLimit.expireLastTab(tab, 0);
      expect(updateActivatedTabsMock).toBeCalledWith({
        activatedTabs: { 1: [{ id: 1234 }] },
      });
      expect(browser.alarms.clear).toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });

    test("create an alarm with lastTabId and unix timestamp", async (done) => {
      const lastTabId = 111;
      getActivatedTabsMock.mockResolvedValue(
        new ActivatedTabs({ 1: [{ id: 111 }] })
      );
      const tab = { tabId: 1234, windowId: 1 };
      const when = 1605316150185;
      await lifeLimit.expireLastTab(tab, when);
      expect(updateActivatedTabsMock).toBeCalledWith({
        activatedTabs: { 1: [{ id: 1234 }, { id: 111 }] },
      });
      expect(browser.alarms.create).toBeCalledWith(`${lastTabId}`, { when });
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
      const when = 1608123162004;
      await lifeLimit.expireInactiveTabs(tabs, when);
      expect(browser.alarms.create).toBeCalledWith("1", { when });
      expect(browser.alarms.create).toBeCalledWith("2", { when: when + 1000 });
      expect(browser.alarms.create).toBeCalledWith("3", { when: when + 2000 });
      expect(updateActivatedTabsMock).toBeCalled();
      done();
    });

    test("do nothing if the tabs are empty", async (done) => {
      await lifeLimit.expireInactiveTabs([], 0);
      expect(updateActivatedTabsMock).not.toBeCalled();
      expect(browser.alarms.create).not.toBeCalled();
      done();
    });
  });
});
