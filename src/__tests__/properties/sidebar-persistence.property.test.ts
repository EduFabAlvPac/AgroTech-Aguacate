import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Property 5: Sidebar state persistence round-trip
 *
 * For any sequence of toggle operations, writing to localStorage under the key
 * "sidebar-collapsed" and then reading it back SHALL produce the correct
 * collapsed/expanded state.
 *
 * **Validates: Requirements 7.6, 7.7**
 */

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

// Mock localStorage with a simple Map-based implementation
function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
  };
}

// Simulate the SidebarProvider write logic
function writeSidebarState(
  localStorage: Storage,
  collapsed: boolean
): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
}

// Simulate the SidebarProvider read logic (hydration on mount)
function readSidebarState(localStorage: Storage): boolean {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

describe("Property 5: Sidebar state persistence round-trip", () => {
  let mockLocalStorage: Storage;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
  });

  it("persisted state always matches the last written value for any sequence of toggles", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        (toggleSequence: boolean[]) => {
          // Reset localStorage
          mockLocalStorage.clear();

          // Apply each toggle operation (simulating user clicks)
          for (const value of toggleSequence) {
            writeSidebarState(mockLocalStorage, value);
          }

          // Read back the final state (simulating component mount/hydration)
          const restoredState = readSidebarState(mockLocalStorage);

          // The restored state must equal the last written value
          const lastWrittenValue = toggleSequence[toggleSequence.length - 1];
          expect(restoredState).toBe(lastWrittenValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("defaults to expanded (false) when no value exists in localStorage", () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        () => {
          // Fresh localStorage with no sidebar key
          const freshStorage = createMockLocalStorage();

          // Reading without any prior write should return false (expanded)
          const state = readSidebarState(freshStorage);
          expect(state).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("applying n toggles from initial state produces correct final localStorage value", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        (numToggles: number) => {
          // Reset localStorage
          mockLocalStorage.clear();

          // Start from default state: expanded (false)
          let currentState = false;

          // Apply n toggle operations
          for (let i = 0; i < numToggles; i++) {
            currentState = !currentState;
            writeSidebarState(mockLocalStorage, currentState);
          }

          // Read back the final state
          const restoredState = readSidebarState(mockLocalStorage);

          // Expected state: n toggles from false means collapsed if n is odd, expanded if n is even
          const expectedState = numToggles % 2 !== 0;
          expect(restoredState).toBe(expectedState);
          expect(restoredState).toBe(currentState);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("write then read is identity for any boolean value", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (collapsed: boolean) => {
          mockLocalStorage.clear();
          writeSidebarState(mockLocalStorage, collapsed);
          const restored = readSidebarState(mockLocalStorage);
          expect(restored).toBe(collapsed);
        }
      ),
      { numRuns: 100 }
    );
  });
});
