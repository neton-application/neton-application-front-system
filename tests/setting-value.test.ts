import assert from "node:assert/strict";
import { test } from "node:test";
import { settingDraft, settingUpdate } from "../src/pages/setting-value.ts";

const booleanSetting = { key: "example.enabled", valueType: 3 };

test("boolean form drafts match the backend parser and submit canonical strings", () => {
  for (const value of ["true", "1", "yes", "on", " TRUE ", "YES"]) {
    assert.equal(settingDraft(booleanSetting, value), "true");
    assert.deepEqual(settingUpdate(booleanSetting, value), { key: booleanSetting.key, value: "true" });
  }
  for (const value of ["false", "0", "no", "off", " FALSE ", "OFF"]) {
    assert.equal(settingDraft(booleanSetting, value), "false");
    assert.deepEqual(settingUpdate(booleanSetting, value), { key: booleanSetting.key, value: "false" });
  }
});

test("an invalid boolean is not silently replaced by a default or submitted", () => {
  for (const value of ["", "enabled", "2"]) {
    assert.equal(settingDraft(booleanSetting, value), value);
    assert.throws(() => settingUpdate(booleanSetting, value), /Invalid boolean/);
  }
});

test("editing a boolean and restoring its default produces the selected wire value", () => {
  let draft = settingDraft(booleanSetting, "true");
  draft = "false";
  assert.equal(settingUpdate(booleanSetting, draft).value, "false");
  draft = settingDraft(booleanSetting, "true");
  assert.equal(settingUpdate(booleanSetting, draft).value, "true");
});

test("registered string settings, empty values and env identifiers use the existing update contract", () => {
  for (const [key, value] of [
    ["example.client_key", "test-client-visible-key"],
    ["example.provider", "google"],
    ["example.service.key_env", "SERVICE_API_KEY"],
    ["example.service.secret_env", "SERVICE_API_SECRET"],
    ["example.service.url", "wss://service.example.invalid"],
    ["future.registered.setting", ""],
  ]) {
    const setting = { key, valueType: 0 };
    assert.equal(settingDraft(setting, value), value);
    assert.deepEqual(settingUpdate(setting, ` ${value} `), { key, value });
  }
});

test("numeric and JSON wire values remain strings without precision loss", () => {
  for (const [valueType, value] of [[1, "123"], [2, "9223372036854775807"], [4, "0.1234567890123456789"], [5, '{"enabled":false}']] as const) {
    const setting = { key: "registered.setting", valueType };
    assert.equal(settingDraft(setting, value), value);
    assert.deepEqual(settingUpdate(setting, value), { key: setting.key, value });
  }
});
