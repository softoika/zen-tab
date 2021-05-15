import { getStorage, updateStorage } from "storage/tabs";
import type { Alarms } from "webextension-polyfill-ts";
import { browser } from "webextension-polyfill-ts";
import { protectAlarmsOnChangeIdleState } from "./idle";
import { removeTabOfAlarms } from "./lifetime";

jest.mock("webextension-polyfill-ts", () => ({
  browser: {
    alarms: { getAll: jest.fn(), clearAll: jest.fn(), create: jest.fn() },
    storage: { local: {} },
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

jest.mock("storage/tabs");
const updateStorageMock = updateStorage as jest.MockedFunction<
  typeof updateStorage
>;
const getStorageMock = getStorage as jest.MockedFunction<typeof getStorage>;

jest.mock("./lifetime");
const removeTabOfAlarmsMock = removeTabOfAlarms as jest.MockedFunction<
  typeof removeTabOfAlarms
>;

describe("idle", () => {
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
    updateStorageMock.mockReset();
    getStorageMock.mockReset();
    removeTabOfAlarmsMock.mockReset();
  });

  describe("evacuateAlarms()", () => {
    test("save alarms and current time to storage and clear it", async (done) => {
      const alarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1616827701912 },
        { name: "2", scheduledTime: 1616829466759 },
      ];
      const now = 1616824701912;
      jest.setSystemTime(now);
      alarmsGetAllMock.mockResolvedValue(alarms);
      await protectAlarmsOnChangeIdleState("locked");
      expect(updateStorageMock).toBeCalledWith({
        evacuatedAlarms: alarms,
        lastLockedAt: now,
      });
      expect(alarmsClearAllMock).toBeCalled();
      done();
    });
  });

  describe("recoverAlarms()", () => {
    test("recover alarms if the scheduled times are not over", async (done) => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: baseTime },
        { name: "2", scheduledTime: baseTime + 60 * 1000 },
      ];
      const lastLockedAt = baseTime - 50 * 60 * 1000;
      getStorageMock.mockResolvedValue({ evacuatedAlarms, lastLockedAt });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await protectAlarmsOnChangeIdleState("active");

      expect(getStorageMock).toBeCalledWith([
        "evacuatedAlarms",
        "lastLockedAt",
      ]);
      expect(alarmsCreateMock).nthCalledWith(1, "1", {
        when: baseTime + 30 * 60 * 1000,
      });
      expect(alarmsCreateMock).nthCalledWith(2, "2", {
        when: baseTime + 31 * 60 * 1000,
      });
      done();
    });

    test("the difference time should be 0 if lastLockedAt isn't set", async (done) => {
      const baseTime = 1616827701912;
      const evacuatedAlarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: baseTime },
        { name: "2", scheduledTime: baseTime + 60 * 1000 },
      ];
      const lastLockedAt = undefined;
      getStorageMock.mockResolvedValue({ evacuatedAlarms, lastLockedAt });
      jest.setSystemTime(baseTime - 20 * 60 * 1000);

      await protectAlarmsOnChangeIdleState("active");

      expect(getStorageMock).toBeCalledWith([
        "evacuatedAlarms",
        "lastLockedAt",
      ]);
      expect(alarmsCreateMock).nthCalledWith(1, "1", {
        when: baseTime,
      });
      expect(alarmsCreateMock).nthCalledWith(2, "2", {
        when: baseTime + 60 * 1000,
      });
      done();
    });
  });
});
