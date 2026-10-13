import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePrefillProviders } from "./usePrefillProviders";

afterEach(() => vi.unstubAllGlobals());

it("ignores a stale result after StrictMode cleanup and aborts on unmount", async () => {
  const pending: { signal: AbortSignal; resolve: (response: Response) => void }[] = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, options: RequestInit) =>
    new Promise<Response>((resolve) => {
      pending.push({ signal: options.signal as AbortSignal, resolve });
    }),
  ));
  const { result, unmount } = renderHook(() => usePrefillProviders(), { wrapper: StrictMode });
  expect(pending).toHaveLength(2);
  expect(pending[0].signal.aborted).toBe(true);
  await act(async () => pending[1].resolve(new Response('{"enabledSourceIds":["global"]}')));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => pending[0].resolve(new Response('{"enabledSourceIds":[]}')));
  expect(result.current).toMatchObject({ status: "ready", providers: [{ id: "global" }] });
  unmount();
  expect(pending[1].signal.aborted).toBe(true);
});

it("ignores aborted request failures when a newer request succeeds", async () => {
  const pending: { reject: (error: Error) => void; resolve: (response: Response) => void }[] = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
    new Promise<Response>((resolve, reject) => pending.push({ resolve, reject })),
  ));
  const { result } = renderHook(() => usePrefillProviders(), { wrapper: StrictMode });
  await act(async () => pending[0].reject(new Error("Aborted")));
  expect(result.current.status).toBe("loading");
  await act(async () => pending[1].resolve(new Response('{"enabledSourceIds":[]}')));
  expect(result.current).toEqual({ status: "ready", providers: [] });
});

it("reports unexpected non-Error failures safely", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue("failed"));
  const { result } = renderHook(() => usePrefillProviders());
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current).toMatchObject({ status: "error", error: new Error("Could not load prefill configuration.") });
});
