import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrefillEditor } from "./PrefillEditor";
import { sampleGraph, NODE_IDS } from "../mocks/sampleGraph";
import { createFormResolver } from "../graph/formLookup";

describe("PrefillEditor target eligibility", () => {
  it("keeps button sources out of target rows and opens targets by their schema key", async () => {
    const node = sampleGraph.nodes.find((candidate) => candidate.id === NODE_IDS.FORM_D)!;
    const onPickField = vi.fn();
    render(
      <PrefillEditor
        node={node}
        form={createFormResolver(sampleGraph)(node)!}
        fieldMap={{}}
        onPickField={onPickField}
        onClearField={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Button/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(6);
    await userEvent.click(screen.getByRole("button", { name: /^Email/ }));
    expect(onPickField).toHaveBeenCalledWith("email");
  });
});
