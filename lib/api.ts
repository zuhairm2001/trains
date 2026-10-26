"use client";

import { useCallback, useEffect, useState } from "react";

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `Request failed (${response.status}). Please try again.`);
  return body as T;
}

export function useApi<T>(path: string | null, revision = 0) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([path, revision, attempt]);
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean; error: string | null }>({ key, data: null, loading: Boolean(path), error: null });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ key, data: null, loading: Boolean(path), error: null });
    if (!path) return () => controller.abort();
    apiRequest<T>(path, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setState({ key, data, loading: false, error: null }); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: cause instanceof Error ? cause.message : "Unable to reach the API. Please try again." });
      });
    return () => controller.abort();
  }, [path, key]);

  const current = state.key === key;
  return { data: current ? state.data : null, loading: current ? state.loading : Boolean(path), error: current ? state.error : null, retry };
}

export function displayDate(value: string | null, withTime = false): string {
  if (!value) return "Not installed";
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(parsed);
}
