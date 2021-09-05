import { DEFAULT_BROWSER_TAB } from "mocks";
import { loadOptions } from "storage/options";
import { updateStorage, getStorage, getValue } from "storage/tabs";
import type { EvacuatedAlarm, TabStorage } from "storage/types";
import type { Alarms, Tabs } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import {
  appendToEvacuationMap,
  evacuateAlarms,
  recoverAlarms,
} from "./evacuation";

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

jest.mock("./lifetime");

jest.mock("storage/options");
const loadOptionsMock = loadOptions as jest.MockedFunction<typeof loadOptions>;

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
    loadOptionsMock.mockReset();
  });

  describe("evacuateAlarms()", () => {
    test("saves alarms and current time to storage and clear it", async () => {
      const now = 1616824701912;
      const alarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: now + 30 * 60_000 },
        { name: "2", scheduledTime: now + 40 * 60_000 },
      ];
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(alarms);
      await evacuateAlarms();
      expect(updateStorageMock).toBeCalledWith({
        evacuatedAlarms: [
          {
            name: "1",
            scheduledTime: now + 30 * 60_000,
            timeLeft: 30 * 60_000,
          },
          {
            name: "2",
            scheduledTime: now + 40 * 60_000,
            timeLeft: 40 * 60_000,
          },
        ],
      });
      expect(alarmsClearAllMock).toBeCalled();
    });
  });

  describe("evacuateAlarms(windowId)", () => {
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
      loadOptionsMock.mockResolvedValue(2);
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
            evacuatedAlarms: [
              {
                name: "1",
                scheduledTime: 1628479861293,
                timeLeft: 10 * 60_000,
              },
              {
                name: "3",
                scheduledTime: 1628481061293,
                timeLeft: 30 * 60_000,
              },
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
      loadOptionsMock.mockResolvedValue(3);
      const now = 1628479261293;
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(allAlarms);
      tabsQueryMock.mockResolvedValue(targetTabs);
      getValueMock.mockResolvedValue({
        123: {
          evacuatedAlarms: [
            { name: "1", scheduledTime: 1628479861293, timeLeft: 10 * 60_000 },
            { name: "3", scheduledTime: 1628481061293, timeLeft: 30 * 60_000 },
          ],
        },
      });

      await evacuateAlarms(123);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            evacuatedAlarms: [
              {
                name: "1",
                scheduledTime: 1628479861293,
                timeLeft: 10 * 60_000,
              },
              {
                name: "3",
                scheduledTime: 1628481061293,
                timeLeft: 30 * 60_000,
              },
              {
                name: "2",
                scheduledTime: 1628480461293,
                timeLeft: 20 * 60_000,
              },
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
      loadOptionsMock.mockResolvedValue(3);
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(allAlarms);
      tabsQueryMock.mockResolvedValue(targetTabs);
      getValueMock.mockResolvedValue({
        123: {
          evacuatedAlarms: [
            { name: "1", scheduledTime: now + 30_000, timeLeft: 30_000 },
            { name: "3", scheduledTime: now + 40_000, timeLeft: 40_000 },
          ],
        },
      });

      await evacuateAlarms(123);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            evacuatedAlarms: [
              { name: "1", scheduledTime: now + 30_000, timeLeft: 30_000 },
              { name: "2", scheduledTime: now + 60_000, timeLeft: 60_000 },
              { name: "3", scheduledTime: now + 120_000, timeLeft: 120_000 },
            ],
          },
        },
      });
      expect(alarmsClearMock).toBeCalledWith("2");
      expect(alarmsClearMock).toBeCalledWith("3");
    });

    test("does nothing if tabs > minTabs", async () => {
      const allAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1628479861293 },
        { name: "2", scheduledTime: 1628480461293 },
        { name: "3", scheduledTime: 1628481061293 },
      ];
      const targetTabs: Tabs.Tab[] = [
        { ...DEFAULT_BROWSER_TAB, id: 1, windowId: 123 },
        { ...DEFAULT_BROWSER_TAB, id: 3, windowId: 123 },
      ];
      loadOptionsMock.mockResolvedValue(1);
      const now = 1628479261293;
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(allAlarms);
      tabsQueryMock.mockResolvedValue(targetTabs);
      getValueMock.mockResolvedValue(undefined);

      await evacuateAlarms(123);

      expect(getValueMock).toBeCalledWith("evacuationMap");
      expect(loadOptionsMock).toBeCalledWith("minTabs");
      expect(updateStorageMock).not.toBeCalled();
      expect(alarmsClearMock).not.toBeCalled();
    });
  });

  describe("appendToEvacuationMap()", () => {
    test("appends alarm info to the existing map", async () => {
      const now = 1630828094955;
      jest.setSystemTime(now);
      getValueMock.mockResolvedValue({
        123: {
          evacuatedAlarms: [
            {
              name: "1",
              scheduledTime: now + 30 * 60_000,
              timeLeft: 30 * 60_000,
            },
          ],
        },
      });

      await appendToEvacuationMap("2", { when: now + 40 * 60_000 }, 123);

      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            evacuatedAlarms: [
              {
                name: "1",
                scheduledTime: now + 30 * 60_000,
                timeLeft: 30 * 60_000,
              },
              {
                name: "2",
                scheduledTime: now + 40 * 60_000,
                timeLeft: 40 * 60_000,
              },
            ],
          },
        },
      });
      expect(getValueMock).toBeCalledWith("evacuationMap");
    });

    test("creates the evacuated alarms list for the window if not exist", async () => {
      const now = 1630828094955;
      jest.setSystemTime(now);
      getValueMock.mockResolvedValue(undefined);

      await appendToEvacuationMap("1", { when: now + 30 * 60_000 }, 123);

      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            evacuatedAlarms: [
              {
                name: "1",
                scheduledTime: now + 30 * 60_000,
                timeLeft: 30 * 60_000,
              },
            ],
          },
        },
      });
      expect(getValueMock).toBeCalledWith("evacuationMap");
    });

    test("overrides the alarm if the name is duplicated", async () => {
      const now = 1630828094955;
      jest.setSystemTime(now);
      getValueMock.mockResolvedValue({
        123: {
          evacuatedAlarms: [
            {
              name: "1",
              scheduledTime: now + 30 * 60_000,
              timeLeft: 30 * 60_000,
            },
            {
              name: "2",
              scheduledTime: now + 40 * 60_000,
              timeLeft: 40 * 60_000,
            },
          ],
        },
      });

      await appendToEvacuationMap("2", { when: now + 50 * 60_000 }, 123);

      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: {
            evacuatedAlarms: [
              {
                name: "1",
                scheduledTime: now + 30 * 60_000,
                timeLeft: 30 * 60_000,
              },
              {
                name: "2",
                scheduledTime: now + 50 * 60_000,
                timeLeft: 50 * 60_000,
              },
            ],
          },
        },
      });
      expect(getValueMock).toBeCalledWith("evacuationMap");
    });
  });

  describe("recoverAlarms()", () => {
    test("recovers alarms if the scheduled times are not over", async () => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: EvacuatedAlarm[] = [
        { name: "1", scheduledTime: baseTime, timeLeft: 30 * 60_000 },
        {
          name: "2",
          scheduledTime: baseTime + 60_000,
          timeLeft: 31 * 60_000,
        },
      ];
      getStorageMock.mockResolvedValue({ evacuatedAlarms });
      const now = baseTime - 20 * 60_000;
      jest.setSystemTime(now);

      await recoverAlarms();

      expect(getStorageMock).toBeCalledWith(["evacuatedAlarms", "tabsMap"]);
      expect(alarmsCreateMock).nthCalledWith(1, "1", {
        when: now + 30 * 60_000,
      });
      expect(alarmsCreateMock).nthCalledWith(2, "2", {
        when: now + 31 * 60_000,
      });
    });

    test("updates the scheduledTime of the tabsMap", async () => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: EvacuatedAlarm[] = [
        { name: "1", scheduledTime: baseTime, timeLeft: 50 * 60_000 },
        { name: "2", scheduledTime: baseTime + 60_000, timeLeft: 51 * 60_000 },
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
      getStorageMock.mockResolvedValue({
        evacuatedAlarms,
        tabsMap,
      });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await recoverAlarms();

      expect(getStorageMock).toBeCalledWith(["evacuatedAlarms", "tabsMap"]);
      expect(updateStorageMock).toBeCalledWith({
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
      });
    });
  });

  describe("recoverAlarms(windowId)", () => {
    test("recovers alarms for the window", async () => {
      const baseTime = 1628502404949;
      const evacuationMap: TabStorage["evacuationMap"] = {
        123: {
          evacuatedAlarms: [
            { name: "1", scheduledTime: baseTime, timeLeft: 50 * 60_000 },
            {
              name: "2",
              scheduledTime: baseTime + 60 * 1000,
              timeLeft: 51 * 60_000,
            },
          ],
        },
        456: {
          evacuatedAlarms: [
            { name: "3", scheduledTime: baseTime, timeLeft: 20 * 60_000 },
          ],
        },
      };
      const tabsMap: TabStorage["tabsMap"] = {
        1: {
          lastInactivated: baseTime - 61 * 60_000,
          scheduledTime: baseTime,
        },
        2: {
          lastInactivated: baseTime - 60 * 60_000,
          scheduledTime: baseTime + 60_000,
        },
      };
      getStorageMock.mockResolvedValue({
        evacuationMap,
        tabsMap,
      });
      jest.setSystemTime(baseTime - 20 * 60_000);

      await recoverAlarms(123);

      expect(getStorageMock).toBeCalledWith(["evacuationMap", "tabsMap"]);
      expect(updateStorageMock).toBeCalledWith({
        evacuationMap: {
          123: undefined,
          456: {
            evacuatedAlarms: [
              { name: "3", scheduledTime: baseTime, timeLeft: 20 * 60_000 },
            ],
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
          evacuatedAlarms: [
            { name: "3", scheduledTime: baseTime, timeLeft: 0 },
          ],
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
