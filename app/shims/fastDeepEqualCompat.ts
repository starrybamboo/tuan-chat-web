type ComparableArrayBufferView = ArrayLike<number | bigint> & ArrayBufferView;

const envHasBigInt64Array = typeof BigInt64Array !== "undefined";

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isArrayBufferView(value: unknown): value is ComparableArrayBufferView {
  if (!envHasBigInt64Array) {
    return ArrayBuffer.isView(value);
  }
  return ArrayBuffer.isView(value);
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (isObjectLike(a) && isObjectLike(b)) {
    if (a.constructor !== b.constructor) {
      return false;
    }

    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) {
        return false;
      }
      for (let index = a.length - 1; index >= 0; index -= 1) {
        if (!equal(a[index], b[index])) {
          return false;
        }
      }
      return true;
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) {
        return false;
      }
      for (const [key] of a.entries()) {
        if (!b.has(key)) {
          return false;
        }
      }
      for (const [key, value] of a.entries()) {
        if (!equal(value, b.get(key))) {
          return false;
        }
      }
      return true;
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) {
        return false;
      }
      for (const [key] of a.entries()) {
        if (!b.has(key)) {
          return false;
        }
      }
      return true;
    }

    if (isArrayBufferView(a) && isArrayBufferView(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let index = a.length - 1; index >= 0; index -= 1) {
        if (a[index] !== b[index]) {
          return false;
        }
      }
      return true;
    }

    if (a instanceof RegExp && b instanceof RegExp) {
      return a.source === b.source && a.flags === b.flags;
    }

    if (a.valueOf !== Object.prototype.valueOf) {
      return a.valueOf() === b.valueOf();
    }

    if (a.toString !== Object.prototype.toString) {
      return a.toString() === b.toString();
    }

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) {
      return false;
    }

    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false;
      }
    }

    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      if (key === "_owner" && "$$typeof" in a) {
        continue;
      }
      if (!equal(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return Number.isNaN(a) && Number.isNaN(b);
}

export { equal };
export default equal;
