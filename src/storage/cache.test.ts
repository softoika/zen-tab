import { CacheController } from "./cache";

interface TestData {
  foo: number;
  bar: string;
}

describe("storage/cache", () => {
  test("can store and restore the cache data", () => {
    const cache = new CacheController<TestData>();
    cache.put({ foo: 1 });
    cache.put({ bar: "baz" });

    expect(cache.get(["foo"])).toEqual({
      data: { foo: 1 },
      missHitKeys: [],
    });
    expect(cache.get(["bar"])).toEqual({
      data: { bar: "baz" },
      missHitKeys: [],
    });
  });

  describe(".get()", () => {
    test("can receive multiple keys", () => {
      const cache = new CacheController<TestData>();
      cache.put({ foo: 1, bar: "a" });

      expect(cache.get(["foo", "bar"])).toEqual({
        data: { foo: 1, bar: "a" },
        missHitKeys: [],
      });
    });

    test("returns the miss-hit keys if some keys don't hit", () => {
      const cache = new CacheController<TestData>();

      expect(cache.get(["foo", "bar"])).toEqual({
        data: {},
        missHitKeys: ["foo", "bar"],
      });

      cache.put({ foo: 2 });
      expect(cache.get(["foo", "bar"])).toEqual({
        data: { foo: 2 },
        missHitKeys: ["bar"],
      });
    });
  });
});
