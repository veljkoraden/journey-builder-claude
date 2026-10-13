import { describe, expect, it } from "vitest";
import { sampleGraph } from "../mocks/sampleGraph";
import { getSourceFields, getTargetFields } from "./fieldUtils";
import type { FormDefinition } from "../api/types";

const form = sampleGraph.forms[0];

describe("field eligibility", () => {
  it("exposes every schema field as a source in schema order, including buttons", () => {
    expect(getSourceFields(form).map((field) => field.name)).toEqual(
      Object.keys(form.field_schema.properties),
    );
    expect(getSourceFields(form)).toContainEqual({ name: "button", title: "Button", avantosType: "button" });
  });

  it("excludes only button widgets from targets", () => {
    expect(getTargetFields(form).map((field) => field.name)).toEqual([
      "dynamic_checkbox_group", "dynamic_object", "email", "id", "name", "notes",
    ]);
  });

  it("preserves keys separately from titles and falls back to the key", () => {
    expect(getSourceFields(form)).toContainEqual({ name: "email", title: "Email", avantosType: "short-text" });
    expect(getSourceFields(form)).toContainEqual({
      name: "dynamic_checkbox_group", title: "dynamic_checkbox_group", avantosType: "checkbox-group",
    });
  });

  it("supports unknown widgets and determines eligibility by type rather than name", () => {
    const custom: FormDefinition = {
      ...form,
      field_schema: { type: "object", properties: {
        button: { type: "string", avantos_type: "future-widget" },
        submit: { type: "object", avantos_type: "button" },
      } },
    };
    expect(getTargetFields(custom).map((field) => field.name)).toEqual(["button"]);
    expect(getSourceFields(custom).map((field) => field.name)).toEqual(["button", "submit"]);
  });

  it("does not fabricate fields for an empty schema", () => {
    const empty: FormDefinition = { ...form, field_schema: { type: "object", properties: {} } };
    expect(getSourceFields(empty)).toEqual([]);
    expect(getTargetFields(empty)).toEqual([]);
    expect(getSourceFields(form).map((field) => field.name)).not.toContain("completed_at");
  });

  it("returns fresh field objects without changing the schema", () => {
    const copy = structuredClone(form);
    getSourceFields(copy)[0].title = "Changed";
    getTargetFields(copy).pop();
    expect(copy).toEqual(form);
    expect(getSourceFields(copy)[0].title).toBe("Button");
  });
});
