import {
  getActivatedTabs,
  getClosedTabHistory,
  getOutdatedTabs,
  updateActivatedTabs,
  updateClosedTabHistory,
  updateOutdatedTabs,
} from "storage/tabs";
import { browser } from "webextension-polyfill-ts";

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

  test.todo("the alarm of the tab should be cleared");
  test.todo("the tab should be added to the history");
  test.todo("the tab should be removed from ActivatedTabs");
  test.todo("the tab should be removed from OutdatedTabs");
  test.todo("stops counting down if tabs <= baseLimit");
  test.todo("do nothing if tabs > baseLimit");
});
