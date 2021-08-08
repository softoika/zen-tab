import {
  getActivatedTabs,
  getClosedTabHistory,
  getOutdatedTabs,
  updateActivatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
} from "storage/tabs";
import { ActivatedTabs, ClosedTabsHistory, OutdatedTabs } from "tabs";
import type { Tab } from "types";
import { browser } from "webextension-polyfill-ts";
import { handleTabsOnRemoved } from "./onRemoved";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { clear: jest.fn() },
  },
}));
const alarmsClearMock = browser.alarms.clear as jest.MockedFunction<
  typeof browser.alarms.clear
>;

jest.mock("storage/tabs");
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

describe("tabs.onRemoved", () => {
  afterEach(() => {
    alarmsClearMock.mockReset();
    getClosedTabHistoryMock.mockReset();
    getActivatedTabsMock.mockReset();
    getOutdatedTabsMock.mockReset();
    updateClosedTabHistoryMock.mockReset();
    updateActivatedTabsMock.mockReset();
    updateOutdatedTabsMock.mockReset();
  });

  test("the alarm of the tab should be cleared", async () => {
    getClosedTabHistoryMock.mockResolvedValue(new ClosedTabsHistory({}, {}));
    getActivatedTabsMock.mockResolvedValue(new ActivatedTabs({}));
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));

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
    getActivatedTabsMock.mockResolvedValue(new ActivatedTabs({}));
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));

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
    getClosedTabHistoryMock.mockResolvedValue(new ClosedTabsHistory({}, {}));
    getActivatedTabsMock.mockResolvedValue(
      new ActivatedTabs({ 12: [{ id: 1 }] })
    );
    getOutdatedTabsMock.mockResolvedValue(new OutdatedTabs({}));

    await handleTabsOnRemoved(1, { windowId: 12, isWindowClosing: false });

    expect(updateActivatedTabsMock).toBeCalledWith(
      new ActivatedTabs({ 12: [] })
    );
  });

  test("the tab should be removed from OutdatedTabs", async () => {
    getClosedTabHistoryMock.mockResolvedValue(new ClosedTabsHistory({}, {}));
    getActivatedTabsMock.mockResolvedValue(new ActivatedTabs({}));
    getOutdatedTabsMock.mockResolvedValue(
      new OutdatedTabs({ 12: [{ id: 1 }] })
    );

    await handleTabsOnRemoved(1, { windowId: 12, isWindowClosing: false });

    expect(updateOutdatedTabsMock).toBeCalledWith(new OutdatedTabs({ 12: [] }));
  });

  // idle同様全てのアラームをクリアする。(新しくタブを作成した時に退避済みかつbaseLimitを超えたらカウント再開だがそれはまた別の話)
  // lastEvacuatedAtが閉じられた時刻でセットされていること、evacuatedAlarmsが削除したアラームに対して保存されていること
  test.todo("stops counting down if tabs <= baseLimit");
  test.todo("do nothing if tabs > baseLimit");
});
