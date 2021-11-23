interface Cache<T> {
  data: Partial<T>;

  /**
   * Keys that weren't hit cache in the requested keys.
   */
  missHitKeys: (keyof T)[];
}

/**
 * In-memory cache controller
 */
export class CacheController<T> {
  private data: Partial<T> = {};

  get<K extends keyof T>(keys: K[]): Cache<T> {
    let data: Partial<T> = {};
    const missHitKeys: K[] = [];

    for (const key of keys) {
      if (this.data[key] === undefined) {
        missHitKeys.push(key);
      } else {
        data = { ...data, [key]: this.data[key] };
      }
    }
    return { data, missHitKeys };
  }

  put(partialData: Partial<T>) {
    this.data = { ...this.data, ...partialData };
  }

  clear() {
    this.data = {};
  }
}
