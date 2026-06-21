import "@testing-library/jest-dom";

// localStorage shim for Zustand persist middleware — jsdom in Node.js 22+
// reports localStorage as unavailable unless --localstorage-file is passed.
// We provide a simple in-memory implementation so persist-backed stores work.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage?.setItem !== "function") {
  const _store = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem:    (k)    => _store[k] ?? null,
      setItem:    (k, v) => { _store[k] = String(v); },
      removeItem: (k)    => { delete _store[k]; },
      clear:      ()     => { Object.keys(_store).forEach((k) => delete _store[k]); },
      key:        (i)    => Object.keys(_store)[i] ?? null,
      get length()       { return Object.keys(_store).length; },
    },
    writable:     true,
    configurable: true,
  });
}
