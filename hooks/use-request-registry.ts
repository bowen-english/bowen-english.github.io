"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RequestHandle = {
  id: string;
  key: string;
  controller: AbortController;
  signal: AbortSignal;
};

type ActiveRequest = Pick<RequestHandle, "id" | "controller">;

function makeRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function useRequestRegistry() {
  const requestsRef = useRef(new Map<string, ActiveRequest>());
  const [activeRequestIds, setActiveRequestIds] = useState<
    Record<string, string>
  >({});

  const startRequest = useCallback((key: string): RequestHandle => {
    requestsRef.current.get(key)?.controller.abort();

    const id = makeRequestId();
    const controller = new AbortController();

    requestsRef.current.set(key, { id, controller });
    setActiveRequestIds((current) => ({ ...current, [key]: id }));

    return { id, key, controller, signal: controller.signal };
  }, []);

  const isCurrentRequest = useCallback((key: string, id: string) => {
    return requestsRef.current.get(key)?.id === id;
  }, []);

  const finishRequest = useCallback((key: string, id: string) => {
    if (requestsRef.current.get(key)?.id !== id) {
      return;
    }

    requestsRef.current.delete(key);
    setActiveRequestIds((current) => {
      if (current[key] !== id) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const abortRequest = useCallback((key: string) => {
    const request = requestsRef.current.get(key);

    if (!request) {
      return;
    }

    request.controller.abort();
    requestsRef.current.delete(key);
    setActiveRequestIds((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const abortMatchingRequests = useCallback(
    (matches: (key: string) => boolean) => {
      const matchingKeys = [...requestsRef.current.keys()].filter(matches);

      matchingKeys.forEach((key) => {
        requestsRef.current.get(key)?.controller.abort();
        requestsRef.current.delete(key);
      });

      if (matchingKeys.length > 0) {
        setActiveRequestIds((current) => {
          const next = { ...current };
          matchingKeys.forEach((key) => delete next[key]);
          return next;
        });
      }
    },
    [],
  );

  useEffect(() => {
    const requests = requestsRef.current;

    return () => {
      requests.forEach((request) => request.controller.abort());
      requests.clear();
    };
  }, []);

  return {
    activeRequestIds,
    startRequest,
    isCurrentRequest,
    finishRequest,
    abortRequest,
    abortMatchingRequests,
  };
}
