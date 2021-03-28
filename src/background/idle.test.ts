import { getValue, updateStorage } from "storage/tabs";
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
const getValueMock = getValue as jest.MockedFunction<typeof getValue>;

jest.mock("./lifetime");
const removeTabOfAlarmsMock = removeTabOfAlarms as jest.MockedFunction<
  typeof removeTabOfAlarms
>;

describe("idle", () => {
  afterEach(() => {
    alarmsGetAllMock.mockReset();
    alarmsClearAllMock.mockReset();
    alarmsCreateMock.mockReset();
    updateStorageMock.mockReset();
    getValueMock.mockReset();
    removeTabOfAlarmsMock.mockReset();
  });

  describe("evacuateAlarms()", () => {
    test("save alarms to storage and clear it", async (done) => {
      const alarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1616827701912 },
        { name: "2", scheduledTime: 1616829466759 },
      ];
      alarmsGetAllMock.mockResolvedValue(alarms);
      await protectAlarmsOnChangeIdleState("locked");
      expect(updateStorageMock).toBeCalledWith({ evacuatedAlarms: alarms });
      expect(alarmsClearAllMock).toBeCalled();
      done();
    });
  });

  describe("recoverAlarms()", () => {
    test("recover alarms if the scheduled times are not over", async (done) => {
      const alarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1616827701912 },
        { name: "2", scheduledTime: 1616829466759 },
      ];
      getValueMock.mockResolvedValue(alarms);
      Date.now = jest.fn(() => 1516827701912);

      await protectAlarmsOnChangeIdleState("active");

      expect(getValueMock).toBeCalledWith("evacuatedAlarms");
      expect(alarmsCreateMock).nthCalledWith(1, "1", { when: 1616827701912 });
      expect(alarmsCreateMock).nthCalledWith(2, "2", { when: 1616829466759 });
      done();
    });

    test("remove the tabs of the alarms if its scheduled times are over", async (done) => {
      const alarms: Alarms.Alarm[] = [
        { name: "1", scheduledTime: 1616827701912 },
        { name: "2", scheduledTime: 1616829466759 },
      ];
      getValueMock.mockResolvedValue(alarms);
      Date.now = jest.fn(() => 1716827701912);

      await protectAlarmsOnChangeIdleState("active");

      expect(alarmsCreateMock).not.toBeCalled();
      expect(removeTabOfAlarmsMock).toBeCalledWith(alarms);
      done();
    });

    describe("the threshold of the recovering is 1 minute after current time", () => {
      test("recovers the last alarm", async (done) => {
        const alarms: Alarms.Alarm[] = [
          { name: "1", scheduledTime: 1616827701912 },
          { name: "2", scheduledTime: 1616829466759 },
        ];
        getValueMock.mockResolvedValue(alarms);
        Date.now = jest.fn(() => 1616829466759 - 60_001);

        await protectAlarmsOnChangeIdleState("active");

        expect(alarmsCreateMock).toBeCalledWith("2", {
          when: 1616829466759,
        });
        expect(removeTabOfAlarmsMock).toBeCalledWith([
          { name: "1", scheduledTime: 1616827701912 },
        ]);
        done();
      });

      test("doesn't recover the last alarm", async (done) => {
        const alarms: Alarms.Alarm[] = [
          { name: "1", scheduledTime: 1616827701912 },
          { name: "2", scheduledTime: 1616829466759 },
        ];
        getValueMock.mockResolvedValue(alarms);
        Date.now = jest.fn(() => 1616829466759 - 60_000);

        await protectAlarmsOnChangeIdleState("active");

        expect(alarmsCreateMock).not.toBeCalled();
        expect(removeTabOfAlarmsMock).toBeCalledWith(alarms);
        done();
      });
    });
  });
});
