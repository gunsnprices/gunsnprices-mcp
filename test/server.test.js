// Starts the server over stdio and calls every tool through a real MCP client.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client;
const call = async (name, args) => JSON.parse((await client.callTool({ name, arguments: args })).content[0].text);

before(async () => {
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [new URL("../src/index.js", import.meta.url).pathname] }));
});
after(() => client.close());

test("lists the tools and instructions", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(),
    ["cost_per_round", "find_price_comparison_pages", "identify_firearm_model", "list_supported", "lookup_caliber", "parse_product_title"]);
  for (const t of tools) assert.ok(t.description.length > 40 && t.annotations.readOnlyHint, t.name);
  assert.match(client.getInstructions(), /gunsnprices\.com/);
});

test("parse_product_title", async () => {
  const r = await call("parse_product_title", { title: "Glock 19 Gen 5 MOS 9mm 4.02in 15rd Pistol" });
  assert.equal(r.model.model, "Glock 19 Gen 5 MOS");
  assert.equal(r.caliber.id, "9x19mmparabellum");
  assert.deepEqual([r.magazine_capacity, r.barrel_length_in], [15, 4.02]);
  assert.ok(r.gunsnprices_pages.some((p) => p.kind === "brand" && p.url.startsWith("https://gunsnprices.com/")));
  assert.equal(r.gunsnprices_pages.at(-1).kind, "search");
  const ammo = await call("parse_product_title", { title: "Federal American Eagle 9mm 115gr FMJ, 50/Box", price: 18.99 });
  assert.deepEqual([ammo.kind, ammo.rounds_per_box, ammo.cost_per_round], ["ammo", 50, 0.3798]);
});

test("identify_firearm_model", async () => {
  const r = await call("identify_firearm_model", { title: "GLOCK 9MM PISTOL 15RD", brand: "Glock", mpn: "PA195S203" });
  assert.equal(r.model.model, "Glock 19 Gen 5");
  const none = await call("identify_firearm_model", { title: "Glock 19 holster" });
  assert.equal(none.found, false);
  assert.ok(none.gunsnprices_pages.some((p) => p.kind === "brand"));
});

test("lookup_caliber", async () => {
  const r = await call("lookup_caliber", { query: "300 BLK" });
  assert.equal(r.calibers[0].name, ".300 AAC Blackout");
  assert.match(r.calibers[0].url, /^https:\/\/gunsnprices\.com\//);
  assert.equal((await call("lookup_caliber", { query: "nothing" })).found, false);
});

test("cost_per_round", async () => {
  const r = await call("cost_per_round", { price: 449.99, title: "Federal American Eagle 5.56x45mm 55gr FMJ 1000 Rounds" });
  assert.deepEqual([r.rounds, r.cost_per_round, r.caliber.id], [1000, 0.45, "5-56x45mmnato"]);
  assert.equal((await call("cost_per_round", { price: 10, rounds: 20 })).cost_per_round, 0.5);
});

test("find_price_comparison_pages", async () => {
  const r = await call("find_price_comparison_pages", { query: "Sig P365 XL" });
  assert.equal(r.model.model, "Sig Sauer P365 XL");
  const brand = await call("find_price_comparison_pages", { query: "S&W" });
  assert.ok(brand.gunsnprices_pages.some((p) => p.name === "All Smith & Wesson models"));
  const ammo = await call("find_price_comparison_pages", { query: "6.5 Creedmoor ammo" });
  assert.equal(ammo.gunsnprices_pages[0].kind, "caliber");
});

test("list_supported", async () => {
  assert.equal((await call("list_supported", { what: "brands" })).length, 50);
  const shotgun = await call("list_supported", { what: "calibers", caliber_type: "shotgun" });
  assert.ok(shotgun.length >= 5 && shotgun.every((c) => c.type === "shotgun"));
});
