import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useBlueprintGraph } from "./useBlueprintGraph";
import { sampleGraph } from "../mocks/sampleGraph";

afterEach(() => vi.unstubAllGlobals());

it("loads successfully and ignores an older StrictMode success", async () => {
  const pending: { signal: AbortSignal; resolve: (response: Response) => void }[] = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, options: RequestInit) =>
    new Promise<Response>((resolve) => pending.push({ resolve, signal: options.signal as AbortSignal })),
  ));
  const { result, unmount } = renderHook(() => useBlueprintGraph(), { wrapper: StrictMode });
  expect(result.current.status).toBe("loading");
  expect(pending).toHaveLength(2);
  expect(pending[0].signal.aborted).toBe(true);
  await act(async () => pending[1].resolve(new Response(JSON.stringify(sampleGraph))));
  expect(result.current).toEqual({ status: "ready", graph: sampleGraph });
  await act(async () => pending[0].resolve(new Response(JSON.stringify({ ...sampleGraph, name: "Stale" }))));
  expect(result.current).toEqual({ status: "ready", graph: sampleGraph });
  unmount();
  expect(pending[1].signal.aborted).toBe(true);
});

it("ignores an aborted request failure while the new request is loading", async () => {
  const pending: { reject: (error: Error) => void; resolve: (response: Response) => void }[] = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
    new Promise<Response>((resolve, reject) => pending.push({ resolve, reject })),
  ));
  const { result } = renderHook(() => useBlueprintGraph(), { wrapper: StrictMode });
  await act(async () => pending[0].reject(new Error("Aborted")));
  expect(result.current.status).toBe("loading");
  await act(async () => pending[1].resolve(new Response(JSON.stringify(sampleGraph))));
  expect(result.current.status).toBe("ready");
});

it("exposes an active request failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
  const { result } = renderHook(() => useBlueprintGraph());
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current).toMatchObject({ error: expect.objectContaining({ message: expect.stringContaining("status 500") }) });
});
