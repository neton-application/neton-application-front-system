import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Translate } from "@neton/application-front-runtime/i18n";
import { SettingValueInput } from "../src/pages/setting-value-input";
import en from "../src/locales/en-US";
import zh from "../src/locales/zh-CN";

const t: Translate = (key) => en[key as keyof typeof en] ?? key;

test("boolean editor exposes only canonical choices and forwards a false selection", () => {
  let selected = "true";
  const control = SettingValueInput({ valueType: 3, value: selected, disabled: false, onChange: (value) => { selected = value; }, t });
  const options = React.Children.toArray(control.props.children).filter(React.isValidElement);
  assert.deepEqual(options.map((option) => (option.props as { value: string }).value), ["true", "false"]);
  control.props.onChange({ target: { value: "false" } });
  assert.equal(selected, "false");
});

test("invalid stored booleans remain visible but cannot be selected as a valid choice", () => {
  const control = SettingValueInput({ valueType: 3, value: "broken", disabled: false, onChange: () => {}, t });
  const options = React.Children.toArray(control.props.children).filter(React.isValidElement);
  assert.equal((options[0].props as { value: string }).value, "broken");
  assert.equal((options[0].props as { disabled: boolean }).disabled, true);
});

test("text editor preserves client keys and environment references without autofill", () => {
  let selected = "";
  const control = SettingValueInput({ valueType: 0, value: "SERVICE_API_SECRET", disabled: false, onChange: (value) => { selected = value; }, t });
  const markup = renderToStaticMarkup(control);
  assert.match(markup, /value="SERVICE_API_SECRET"/);
  assert.match(markup, /autoComplete="off"/i);
  control.props.onChange({ target: { value: "test-client-visible-key" } });
  assert.equal(selected, "test-client-visible-key");
});

test("both input types are disabled during a pending write", () => {
  for (const valueType of [0, 3]) {
    const control = SettingValueInput({ valueType, value: valueType === 3 ? "false" : "", disabled: true, onChange: () => {}, t });
    assert.equal(control.props.disabled, true);
    assert.match(renderToStaticMarkup(control), /disabled/);
  }
});

test("both locales supply translated boolean choices without missing keys", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const messages of [en, zh]) {
    for (const key of ["setting.boolean.true", "setting.boolean.false", "setting.boolean.select"]) {
      assert.equal(typeof messages[key], "string");
      assert.ok(messages[key].length > 0);
    }
    const translate: Translate = (key) => messages[key as keyof typeof messages] ?? key;
    const control = SettingValueInput({ valueType: 3, value: "false", disabled: false, onChange: () => {}, t: translate });
    const options = React.Children.toArray(control.props.children).filter(React.isValidElement);
    assert.deepEqual(options.map((option) => (option.props as { children: string }).children), [messages["setting.boolean.true"], messages["setting.boolean.false"]]);
  }
});
