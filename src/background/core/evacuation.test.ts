import { DEFAULT_BROWSER_TAB } from "mocks";
import { updateStorage, getStorage, getValue } from "storage/tabs";
import type { TabStorage } from "storage/types";
import type { Alarms, Tabs } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { evacuateAlarms, recoverAlarms } from "./evacuation";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: {
      getAll: jest.fn(),
      clearAll: jest.fn(),
      create: jest.fn(),
      clear: jest.fn(),
    },
    storage: { local: {} },
    tabs: { query: jest.fn() },
  },
}));
const alarmsGetAllMock = browser.alarms.getAll as jest.MockedFunction<
  typeof browser.alarms.getAll
>;
const alarmsClearAllMock = browser.alarms.clearAll as jest.MockedFunction<
  typeof browser.alarms.clearAll
>;
const alarmsCreateMock = browser.alarms.create as jest.MockedFunction<
  typeof browser.alarms.create
>;
const alarmsClearMock = browser.alarms.clear as jest.MockedFunction<
  typeof browser.alarms.clear
>;
const tabsQueryMock = browser.tabs.query as jest.MockedFunction<
  typeof browser.tabs.query
>;

jest.mock("storage/tabs");
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;
const getValueMock = getValue as jest.MockedFunction<typeof getValue>;

jest.mock("background/lifetime");

describe("background/core/evacuation", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    alarmsGetAllMock.mockReset();
    alarmsClearAllMock.mockReset();
    alarmsCreateMock.mockReset();
    alarmsClearMock.mockReset();
    tabsQueryMock.mockReset();
    updateStorageMock.mockReset();
    getStorageMock.mockReset();
    getValueMock.mockReset();
  });

  describe("evacuateAlarms()", () => {
    test("saves alarms and current time to storage and clear it", async () => {
      const alarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1616827701912 },
        { name: "2", scheduledTime: 1616829466759 },
      ];
      const now = 1616824701912;
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(alarms);
      await evacuateAlarms();
      expect(updateStorageMock).toBeCalledWith({
        evacuatedAlarms: alarms,
        lastEvacuatedAt: now,
      });
      expect(alarmsClearAllMock).toBeCalled();
    });
  });

  describe("evacuatedAlarms(windowId)", () => {
    test("evacuates alarms for the target window", async () => {
      const allAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1628479861293 },
        { name: "2", scheduledTime: 1628480461293 },
        { name: "3", scheduledTime: 1628481061293 },
      ];
      const targetTabs: Tabs.Tab[] = [
        { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
        { ...DEFAULT_BROWSER_TAB, id: 3, windowId: 123 },
      ];
      const now = 1628479261293;
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(allAlarms);
      tabsQueryMock.mockResolvedValue(targetTabs);
      getValueMock.mockResolvedValue(undefined);

      await evacuateAlarms(123);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            lastEvacuatedAt: now,
            evacuatedAlarms: [
              { name: "1", scheduledTime: 1628479861293 },
              { name: "3", scheduledTime: 1628481061293 },
            ],
          },
        },
      });
      expect(alarmsClearMock).toBeCalledWith("1");
      expect(alarmsClearMock).not.toBeCalledWith("2");
      expect(alarmsClearMock).toBeCalledWith("3");
    });

    test("keeps the existing evacuatedAlarms in the same window", async () => {
      const allAlarms: Alarms.Alarm[] = [
        { name: "2", scheduledTime: 1628480461293 },
      ];
      const targetTabs: Tabs.Tab[] = [
        { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
        { ...DEFAULT_BROWSER_TAB, id: 2, windowId: 123 },
        { ...DEFAULT_BROWSER_TAB, id: 3, windowId: 123 },
      ];
      const now = 1628479261293;
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(allAlarms);
      tabsQueryMock.mockResolvedValue(targetTabs);
      getValueMock.mockResolvedValue({
        123: {
          lastEvacuatedAt: now - 60_000,
          evacuatedAlarms: [
            { name: "1", scheduledTime: 1628479861293 },
            { name: "3", scheduledTime: 1628481061293 },
          ],
        },
      });

      await evacuateAlarms(123);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            lastEvacuatedAt: now,
            evacuatedAlarms: [
              { name: "1", scheduledTime: 1628479861293 },
              { name: "3", scheduledTime: 1628481061293 },
              { name: "2", scheduledTime: 1628480461293 },
            ],
          },
        },
      });
      expect(alarmsClearMock).toBeCalledWith("2");
    });

    test("updates the alarm in the same window if the same name alarm exists", async () => {
      const now = 1628479261293;
      const allAlarms: Alarms.Alarm[] = [
        { name: "2", scheduledTime: now + 60_000 },
        { name: "3", scheduledTime: now + 120_000 },
      ];
      const targetTabs: Tabs.Tab[] = [
        { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
        { ...DEFAULT_BROWSER_TAB, id: 2, windowId: 123 },
        { ...DEFAULT_BROWSER_TAB, id: 3, windowId: 123 },
      ];
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(allAlarms);
      tabsQueryMock.mockResolvedValue(targetTabs);
      getValueMock.mockResolvedValue({
        123: {
          lastEvacuatedAt: now - 60_000,
          evacuatedAlarms: [
            { name: "1", scheduledTime: now + 30_000 },
            { name: "3", scheduledTime: now + 40_000 },
          ],
        },
      });

      await evacuateAlarms(123);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            lastEvacuatedAt: now,
            evacuatedAlarms: [
              { name: "1", scheduledTime: now + 30_000 },
              { name: "2", scheduledTime: now + 60_000 },
              { name: "3", scheduledTime: now + 120_000 },
            ],
          },
        },
      });
      expect(alarmsClearMock).toBeCalledWith("2");
      expect(alarmsClearMock).toBeCalledWith("3");
    });
  });

  describe("recoverAlarms()", () => {
    test("recovers alarms if the scheduled times are not over", async () => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: baseTime },
        { name: "2", scheduledTime: baseTime + 60 * 1000 },
      ];
      const lastEvacuatedAt = baseTime - 50 * 60 * 1000;
      getStorageMock.mockResolvedValue({ evacuatedAlarms, lastEvacuatedAt });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await recoverAlarms();

      expect(getStorageMock).toBeCalledWith([
        "evacuatedAlarms",
        "lastEvacuatedAt",
        "tabsMap",
      ]);
      expect(alarmsCreateMock).nthCalledWith(1, "1", {
        when: baseTime + 30 * 60 * 1000,
      });
      expect(alarmsCreateMock).nthCalledWith(2, "2", {
        when: baseTime + 31 * 60 * 1000,
      });
    });

    test("updates the scheduledTime of the tabsMap", async () => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: baseTime },
        { name: "2", scheduledTime: baseTime + 60 * 1000 },
      ];
      const tabsMap: TabStorage["tabsMap"] = {
        1: {
          lastInactivated: baseTime - 61 * 60 * 1000,
          scheduledTime: baseTime,
        },
        2: {
          lastInactivated: baseTime - 60 * 60 * 1000,
          scheduledTime: baseTime + 60 * 1000,
        },
      };
      const lastEvacuatedAt = baseTime - 50 * 60 * 1000;
      getStorageMock.mockResolvedValue({
        evacuatedAlarms,
        lastEvacuatedAt,
        tabsMap,
      });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await recoverAlarms();

      expect(getStorageMock).toBeCalledWith([
        "evacuatedAlarms",
        "lastEvacuatedAt",
        "tabsMap",
      ]);
      expect(updateStorageMock.mock.calls[0][0]).toStrictEqual({
        evacuatedAlarms: [],
        tabsMap: {
          1: {
            lastInactivated: baseTime - 61 * 60 * 1000,
            scheduledTime: baseTime + 30 * 60 * 1000,
          },
          2: {
            lastInactivated: baseTime - 60 * 60 * 1000,
            scheduledTime: baseTime + 31 * 60 * 1000,
          },
        },
        lastEvacuatedAt: undefined,
      });
    });

    test("the difference time should be 0 if lastEvacuatedAt isn't set", async () => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: baseTime },
        { name: "2", scheduledTime: baseTime + 60 * 1000 },
      ];
      const lastEvacuatedAt = undefined;
      getStorageMock.mockResolvedValue({ evacuatedAlarms, lastEvacuatedAt });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await recoverAlarms();

      expect(getStorageMock).toBeCalledWith([
        "evacuatedAlarms",
        "lastEvacuatedAt",
        "tabsMap",
      ]);
      expect(alarmsCreateMock).nthCalledWith(1, "1", {
        when: baseTime,
      });
      expect(alarmsCreateMock).nthCalledWith(2, "2", {
        when: baseTime + 60 * 1000,
      });
    });
  });

  describe("recoverAlarms(windowId)", () => {
    test("recovers alarms for the window", async () => {
      const baseTime = 1628502404949;
      const evacuationMap: TabStorage["evacuationMap"] = {
        123: {
          lastEvacuatedAt: baseTime - 50 * 60 * 1000,
          evacuatedAlarms: [
            { name: "1", scheduledTime: baseTime },
            { name: "2", scheduledTime: baseTime + 60 * 1000 },
          ],
        },
        456: {
          lastEvacuatedAt: baseTime,
          evacuatedAlarms: [{ name: "3", scheduledTime: baseTime }],
        },
      };
      const tabsMap: TabStorage["tabsMap"] = {
        1: {
          lastInactivated: baseTime - 61 * 60 * 1000,
          scheduledTime: baseTime,
        },
        2: {
          lastInactivated: baseTime - 60 * 60 * 1000,
          scheduledTime: baseTime + 60 * 1000,
        },
      };
      getStorageMock.mockResolvedValue({
        evacuationMap,
        tabsMap,
      });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await recoverAlarms(123);

      expect(getStorageMock).toBeCalledWith(["evacuationMap", "tabsMap"]);
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          // 123 should be removed (undefined).
          456: {
            lastEvacuatedAt: baseTime,
            evacuatedAlarms: [{ name: "3", scheduledTime: baseTime }],
          },
        },
        tabsMap: {
          1: {
            lastInactivated: baseTime - 61 * 60 * 1000,
            scheduledTime: baseTime + 30 * 60 * 1000,
          },
          2: {
            lastInactivated: baseTime - 60 * 60 * 1000,
            scheduledTime: baseTime + 31 * 60 * 1000,
          },
        },
      });
      expect(alarmsCreateMock).nthCalledWith(1, "1", {
        when: baseTime + 30 * 60 * 1000,
      });
      expect(alarmsCreateMock).nthCalledWith(2, "2", {
        when: baseTime + 31 * 60 * 1000,
      });
    });

    test("does nothing if the alarms of the window aren't evacuated", async () => {
      const baseTime = 1628502404949;
      const evacuationMap: TabStorage["evacuationMap"] = {
        // 123 does not exist
        456: {
          lastEvacuatedAt: baseTime,
          evacuatedAlarms: [{ name: "3", scheduledTime: baseTime }],
        },
      };
      const tabsMap: TabStorage["tabsMap"] = {
        1: {
          lastInactivated: baseTime - 61 * 60 * 1000,
          scheduledTime: baseTime,
        },
        2: {
          lastInactivated: baseTime - 60 * 60 * 1000,
          scheduledTime: baseTime + 60 * 1000,
        },
      };
      getStorageMock.mockResolvedValue({
        evacuationMap,
        tabsMap,
      });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await recoverAlarms(123);

      expect(updateStorageMock).not.toBeCalled();
      expect(alarmsCreateMock).not.toBeCalled();
    });
  });
});
