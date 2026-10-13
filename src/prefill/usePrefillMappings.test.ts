import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePrefillMappings } from "./usePrefillMappings";
import type { PrefillSource } from "./types";

const source: PrefillSource = {
  providerId: "form_field",
  optionKey: "node-1:email",
  label: "Form A.email",
};

describe("usePrefillMappings", () => {
  it("starts with no mapping for a field", () => {
    const { result } = renderHook(() => usePrefillMappings());
    expect(result.current.getFieldMap("node-x")).toEqual({});
  });

  it("sets and clears a mapping for a specific node/field", () => {
    const { result } = renderHook(() => usePrefillMappings());

    act(() => result.current.setMapping("node-x", "email", source));
    expect(result.current.getFieldMap("node-x").email).toEqual(source);

    act(() => result.current.clearMapping("node-x", "email"));
    expect(result.current.getFieldMap("node-x").email).toBeUndefined();
  });

  it("keeps mappings for different nodes independent", () => {
    const { result } = renderHook(() => usePrefillMappings());

    act(() => result.current.setMapping("node-a", "email", source));
    expect(result.current.getFieldMap("node-b")).toEqual({});
  });
});
