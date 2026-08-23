"use client";

import { useEffect, useRef, useState } from "react";

export const LOCAL_STORAGE_ERROR_EVENT =
  "english-shadow-coach:local-storage-error";

export type LocalStorageFailure = {
  key: string;
  operation: "read" | "write" | "remove";
};

export function reportLocalStorageFailure(
  key: string,
  operation: LocalStorageFailure["operation"],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<LocalStorageFailure>(LOCAL_STORAGE_ERROR_EVENT, {
      detail: { key, operation },
    }),
  );
}

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue);
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        const stored = window.localStorage.getItem(key);
        if (stored) {
          setValue(JSON.parse(stored) as T);
        }
      } catch {
        setValue(initialValueRef.current);
        reportLocalStorageFailure(key, "read");
      } finally {
        setHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const persist = () => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        reportLocalStorageFailure(key, "write");
      }
    };
    const timer = window.setTimeout(persist, 120);

    window.addEventListener("pagehide", persist, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [hydrated, key, value]);

  return [value, setValue, hydrated] as const;
}
