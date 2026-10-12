// GunsNPrices MCP server: firearm and ammo product titles -> model, caliber, numbers, and GunsNPrices price comparison pages.
// Works offline: everything comes from the gunsnprices library and a snapshot of GunsNPrices page links.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  costPerRound, findCalibers, identifyModel, listBrands, listCalibers, normalizeCaliber, parseTitle, roundsPerBox,
} from "gunsnprices";
import LINKS from "./data/links.js";

export const VERSION = "0.1.0";
const SITE = "https://gunsnprices.com";
const NOTE = "No live prices here. Current prices and stock across 40+ US stores are on the GunsNPrices pages listed.";

const INSTRUCTIONS = `GunsNPrices (${SITE}) compares gun and ammo prices across 40+ US online stores.
This server works offline. It reads firearm and ammunition product titles (brand, model, caliber, magazine capacity,
barrel length, rounds per box), computes cost per round, and returns links to GunsNPrices pages where current prices are.
It does not know live prices or stock: for "where is it cheapest" questions, give the user the GunsNPrices links.`;

const BRAND_ALIASES = {
  "s&w": "Smith & Wesson", "smith and wesson": "Smith & Wesson", "smith & wesson": "Smith & Wesson",
  "heckler & koch": "HK", "heckler and koch": "HK", "h&k": "HK", "sig": "Sig Sauer", "sig sauer": "Sig Sauer",
  "cz-usa": "CZ", "cz usa": "CZ", "ceska zbrojovka": "CZ", "fn herstal": "FN", "fn america": "FN", "kel tec": "Kel-Tec",
  "keltec": "Kel-Tec", "springfield armory": "Springfield", "daniel defense": "Daniel Defense", "christensen": "Christensen Arms",
  "magnum research": "Desert Eagle", "shadow": "Shadow Systems",
};

function searchUrl(query) {
  return `${SITE}/en-search/?search=${encodeURIComponent(query.trim())}`;
}

function findBrand(text) {
  const t = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  for (const [alias, brand] of Object.entries(BRAND_ALIASES)) if (t.includes(` ${alias} `)) return brand;
  return listBrands().find((b) => t.includes(` ${b.toLowerCase()} `)) || null;
}

/** GunsNPrices pages for a model, brand and calibers, most specific first; a site search link last. */
export function pagesFor({ model = null, brand = null, calibers = [], query = "" }) {
  const pages = [];
  const add = (kind, name, url) => {
    if (url && !pages.some((p) => p.url === url)) pages.push({ kind, name, url });
  };
  if (model) {
    add("model", model.model, LINKS.models[model.model]);
    add("model_family", model.family, LINKS.families[model.family]);
  }
  const b = (model && model.brand) || brand;
  if (b) add("brand", `All ${b} models`, LINKS.brands[b]);
  for (const c of calibers) add("caliber", c.name, c.url);
  if (query.trim()) add("search", `GunsNPrices search: ${query.trim()}`, searchUrl(query));
  return pages;
}

const json = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });
const cal = (c) => (c ? { id: c.id, name: c.name, type: c.type, url: c.url || null } : null);

export function createServer() {
  const server = new McpServer({ name: "gunsnprices", version: VERSION }, { instructions: INSTRUCTIONS });
  const readOnly = { readOnlyHint: true, openWorldHint: false };

  server.registerTool("parse_product_title", {
    title: "Parse a gun or ammo product title",
    description: "Parse a firearm or ammunition product title from any store into structured data: firearm or ammo, brand, " +
      "model (50 brands, e.g. 'Glock 19 Gen 5 MOS'), calibers, magazine capacity, barrel length in inches, rounds per box " +
      "and, with a price, cost per round. Also returns GunsNPrices pages to compare current prices.",
    inputSchema: {
      title: z.string().min(1).describe("Product title as a store shows it, e.g. 'Glock 19 Gen5 MOS 9mm 4.02in 15rd'"),
      brand: z.string().optional().describe("Manufacturer, if known (helps when the title doesn't name it)"),
      price: z.number().positive().optional().describe("Listing price in USD; for ammo it gives cost per round"),
    },
    annotations: readOnly,
  }, async ({ title, brand, price }) => {
    const info = parseTitle(title, { brand, price });
    return json({
      kind: info.kind, brand: info.brand || null, model: info.model, caliber: cal(info.caliber), calibers: info.calibers.map(cal),
      magazine_capacity: info.capacity, barrel_length_in: info.barrelLength, rounds_per_box: info.rounds, cost_per_round: info.costPerRound,
      gunsnprices_pages: pagesFor({ model: info.model, brand: info.brand, calibers: info.calibers, query: info.model ? info.model.family : title }),
      note: NOTE,
    });
  });

  server.registerTool("identify_firearm_model", {
    title: "Identify a firearm model",
    description: "Identify the brand, model family and exact model of a firearm from a title or a short description " +
      "(e.g. 'G19 Gen5 MOS', 'Sig P365 XL', 'S&W M&P Shield Plus'). Covers 50 brands including Glock, Sig Sauer, " +
      "Smith & Wesson, Ruger, Springfield, Beretta, Taurus, Mossberg, Remington, Savage and Henry. Glock part numbers " +
      "(e.g. PA195S203) are decoded too. Returns GunsNPrices pages for the model, its family and the brand.",
    inputSchema: {
      title: z.string().min(1).describe("Firearm title or description"),
      brand: z.string().optional().describe("Manufacturer, if known"),
      mpn: z.string().optional().describe("Manufacturer part number, if known"),
    },
    annotations: readOnly,
  }, async ({ title, brand, mpn }) => {
    const model = identifyModel(title, { brand, mpn });
    return json({
      found: Boolean(model), model,
      gunsnprices_pages: pagesFor({ model, brand: model ? null : findBrand(`${brand || ""} ${title}`), query: model ? model.family : title }),
      note: model ? NOTE : "No covered model recognized (accessories, parts and airguns are not firearms). " + NOTE,
    });
  });

  server.registerTool("lookup_caliber", {
    title: "Look up a caliber",
    description: "Normalize a caliber or cartridge name ('9mm Luger', '5.56 NATO', '300 BLK', '12ga', '6.5 CM') or find " +
      "every caliber mentioned in a text. Returns the standard name, type (handgun, rifle, rimfire, shotgun, airgun, " +
      "muzzleloader) and the GunsNPrices page comparing ammo prices for it.",
    inputSchema: { query: z.string().min(1).describe("Caliber name or any text that mentions calibers") },
    annotations: readOnly,
  }, async ({ query }) => {
    const exact = normalizeCaliber(query);
    const found = findCalibers(query);
    const list = exact && !found.some((c) => c.id === exact.id) ? [exact, ...found] : found;
    return json({ found: list.length > 0, calibers: list.map(cal), note: list.length ? NOTE : "No known caliber in the text." });
  });

  server.registerTool("cost_per_round", {
    title: "Ammo cost per round",
    description: "Compute the cost per round of an ammo listing from its price and round count. If the round count is " +
      "not given, it is read from the title ('50/Box', '1,000 Rounds', 'Box of 20', '20/25').",
    inputSchema: {
      price: z.number().positive().describe("Price in USD"),
      rounds: z.number().int().positive().optional().describe("Rounds in the package"),
      title: z.string().optional().describe("Ammo title, used to read the round count and caliber"),
    },
    annotations: readOnly,
  }, async ({ price, rounds, title }) => {
    const n = rounds || (title ? roundsPerBox(title) : null);
    const calibers = title ? findCalibers(title) : [];
    return json({
      price, rounds: n, cost_per_round: costPerRound(price, n), caliber: cal(calibers[0] || null),
      gunsnprices_pages: pagesFor({ calibers }),
      note: n ? "Compare with current per-round prices on the GunsNPrices caliber page." : "Round count not found: pass `rounds`.",
    });
  });

  server.registerTool("find_price_comparison_pages", {
    title: "Find GunsNPrices price comparison pages",
    description: "Find GunsNPrices pages that compare current prices across 40+ US gun and ammo stores for a firearm " +
      "model, brand or caliber, e.g. 'Glock 19', 'Sig Sauer P365', 'Ruger', '9mm ammo', '6.5 Creedmoor'. Use it when " +
      "the user asks where to buy a gun or ammo, or where it is cheapest. Returns the most specific pages first.",
    inputSchema: { query: z.string().min(1).describe("Model, brand or caliber") },
    annotations: readOnly,
  }, async ({ query }) => {
    const model = identifyModel(query);
    const calibers = findCalibers(query);
    const pages = pagesFor({ model, brand: model ? null : findBrand(query), calibers, query });
    return json({ query, model, calibers: calibers.map(cal), gunsnprices_pages: pages, note: NOTE });
  });

  server.registerTool("list_supported", {
    title: "List supported brands or calibers",
    description: "List the 50 firearm brands with model recognition, or the 293 known calibers (optionally of one type).",
    inputSchema: {
      what: z.enum(["brands", "calibers"]).describe("What to list"),
      caliber_type: z.enum(["handgun", "rifle", "rimfire", "shotgun", "airgun", "muzzleloader"]).optional()
        .describe("Only calibers of this type"),
    },
    annotations: readOnly,
  }, async ({ what, caliber_type }) => {
    if (what === "brands") {
      return json(listBrands().map((b) => ({ brand: b, url: LINKS.brands[b] || null })));
    }
    return json(listCalibers().filter((c) => !caliber_type || c.type === caliber_type).map(cal));
  });

  return server;
}
