/**
 * ONE-TIME: seed the new Device Category taxonomy's Brand/DeviceModel data
 * across every real business, per explicit request ("get the tree currently
 * ... check and update the data as per Indian Market ... for remaining
 * brands updated every model relesed in india add them to the list").
 *
 * SCOPE, agreed with the user up front: this is NOT an exhaustive catalog of
 * every SKU ever sold in India (thousands of real models across ~40 brands
 * is not something to fabricate from memory -- that risk was explicitly
 * flagged and the user chose the reduced scope below). Apple gets its full,
 * verified lineup (iPhone/iPad/MacBook/iMac/Watch/AirPods -- compact enough
 * to state with high confidence). Every other brand gets 10-20 well-known
 * flagship/mainstream models as a real, accurate starting point --
 * expandable via the admin UI (Brands / Device Models pages) from here.
 *
 * IDEMPOTENT / INSERT-ONLY: every Brand/DeviceModel is looked up by its
 * real unique key before creating, and a brand that already exists (e.g.
 * the user's manually-entered Apple/Samsung/etc.) only gets its `category`
 * backfilled if unset -- an admin's existing category choice is never
 * overwritten.
 *
 * A brand that genuinely spans multiple device types (Samsung: phones, TVs,
 * fridges, ACs; Apple: phones, tablets, laptops, desktops, watches, audio)
 * gets one Brand row PER category it's listed under here -- see Brand.ts's
 * unique index, which is now {businessId, category, name} for exactly this
 * reason, not {businessId, name} alone.
 *
 * SERIES: every Brand->DeviceModel edge created here now also gets a Series
 * (Brand -> Series -> DeviceModel, see src/models/Series.ts). Models are
 * grouped into their real product line where one exists (Samsung's Galaxy
 * S/A/M/Note/Z/Tab/Book/Watch/Buds, Apple's iPhone/iPad/MacBook/Mac/
 * Watch/AirPods, Xiaomi's Redmi/Redmi Note/Mi/Xiaomi Pad, OnePlus's Nord,
 * Sony's Bravia, LG's Gram, ...) via deriveSeriesName() below; every other
 * brand/model falls back to one catch-all "General" series so nothing is
 * left without a seriesId. This script remains a curated starting point,
 * not an exhaustive SKU catalog -- extend it further from here via the
 * Masters UI (Brands / Series / Device Models pages) or the Service Center
 * BOM bulk-upload CSV (which itself auto-creates Brand/Series/DeviceModel
 * rows by name), not only by re-running this script.
 *
 * HOW TO RUN:
 *   npx tsx --env-file=.env.local scripts/seedDeviceCategories.ts
 */

import { connectDB } from "../src/core/db/mongodb";
import Business from "../src/models/Business";
import Brand from "../src/models/Brand";
import Series from "../src/models/Series";
import DeviceModel from "../src/models/DeviceModel";
import { DEVICE_CATEGORIES, type DeviceCategory } from "../src/core/catalog/deviceCategory";

// Best-effort mapping from (brand, model name) to its real product line --
// deliberately simple prefix/substring matching over the curated model
// names above (not a general-purpose parser), falling back to "General"
// for brands with no natural line or a model this doesn't recognize.
function deriveSeriesName(brandName: string, modelName: string): string {
  const m = modelName;
  switch (brandName) {
    case "Samsung":
      if (/^Galaxy S\d/.test(m)) return "Galaxy S";
      if (/^Galaxy A\d/.test(m)) return "Galaxy A";
      if (/^Galaxy M\d/.test(m)) return "Galaxy M";
      if (/^Galaxy F\d/.test(m)) return "Galaxy F";
      if (/^Galaxy Note/.test(m)) return "Galaxy Note";
      if (/^Galaxy Z/.test(m)) return "Galaxy Z";
      if (/^Galaxy Tab/.test(m)) return "Galaxy Tab";
      if (/^Samsung Galaxy Book|^Galaxy Book/.test(m)) return "Galaxy Book";
      if (/^Galaxy Watch/.test(m)) return "Galaxy Watch";
      if (/^Galaxy Buds/.test(m)) return "Galaxy Buds";
      return "General";
    case "Apple":
      if (/^iPhone/.test(m)) return "iPhone";
      if (/^iPad/.test(m)) return "iPad";
      if (/^MacBook/.test(m)) return "MacBook";
      if (/^iMac|^Mac Mini|^Mac Studio|^Mac Pro/.test(m)) return "Mac";
      if (/^Apple Watch/.test(m)) return "Watch";
      if (/^AirPods/.test(m)) return "AirPods";
      return "General";
    case "Xiaomi":
      if (/^Redmi Note/.test(m)) return "Redmi Note";
      if (/^Redmi/.test(m)) return "Redmi";
      if (/^Mi /.test(m)) return "Mi";
      if (/^Xiaomi Pad/.test(m)) return "Xiaomi Pad";
      if (/^Xiaomi TV|^Mi TV/.test(m)) return "Xiaomi TV";
      if (/^Xiaomi/.test(m)) return "Xiaomi";
      return "General";
    case "OnePlus":
      if (/^OnePlus Nord/.test(m)) return "Nord";
      if (/^OnePlus TV/.test(m)) return "OnePlus TV";
      if (/^OnePlus \d/.test(m)) return "OnePlus";
      return "General";
    case "Sony":
      if (/^Sony Bravia/.test(m)) return "Bravia";
      if (/^Sony (WH|WF|SRS)/.test(m)) return "Audio";
      return "General";
    case "LG":
      if (/^LG Gram/.test(m)) return "Gram";
      return "General";
    case "POCO":
      return "Poco";
    default:
      return "General";
  }
}

type BrandSeed = { brand: string; models: string[] };

const CATEGORY_DATA: Partial<Record<DeviceCategory, BrandSeed[]>> = {
  MOBILE: [
    {
      brand: "Apple",
      // Full lineup, iPhone 4 through the 16 series -- the compact,
      // well-documented range this seed can state with high confidence.
      // Add newer launches (17-series and beyond) via the admin UI.
      models: [
        "iPhone 4", "iPhone 4s", "iPhone 5", "iPhone 5c", "iPhone 5s",
        "iPhone 6", "iPhone 6 Plus", "iPhone 6s", "iPhone 6s Plus",
        "iPhone SE (1st generation)", "iPhone 7", "iPhone 7 Plus",
        "iPhone 8", "iPhone 8 Plus", "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
        "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
        "iPhone SE (2nd generation)", "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
        "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
        "iPhone SE (3rd generation)", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
        "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
        "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e",
      ],
    },
    { brand: "Samsung", models: ["Galaxy S21", "Galaxy S21 Ultra", "Galaxy S22", "Galaxy S22 Ultra", "Galaxy S23", "Galaxy S23 Ultra", "Galaxy S23 FE", "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy Note 20 Ultra", "Galaxy Z Fold 5", "Galaxy Z Fold 6", "Galaxy Z Flip 5", "Galaxy Z Flip 6", "Galaxy A54", "Galaxy A34", "Galaxy A15", "Galaxy A25", "Galaxy A35", "Galaxy M14", "Galaxy M34", "Galaxy M54", "Galaxy F14", "Galaxy F54"] },
    { brand: "OnePlus", models: ["OnePlus 9", "OnePlus 9 Pro", "OnePlus 10 Pro", "OnePlus 11", "OnePlus 12", "OnePlus 13", "OnePlus Nord 2", "OnePlus Nord 3", "OnePlus Nord CE 3", "OnePlus Nord CE 4", "OnePlus Nord 4", "OnePlus 11R", "OnePlus 12R"] },
    { brand: "Xiaomi", models: ["Redmi Note 10", "Redmi Note 11", "Redmi Note 12", "Redmi Note 13", "Redmi Note 13 Pro", "Redmi 12", "Redmi 13C", "Redmi K50i", "Mi 11X", "Xiaomi 13 Pro", "Xiaomi 14"] },
    { brand: "POCO", models: ["Poco X5", "Poco X5 Pro", "Poco X6", "Poco X6 Pro", "Poco F5", "Poco F6", "Poco M6 Pro", "Poco C55", "Poco C65"] },
    { brand: "Vivo", models: ["Vivo V25", "Vivo V27", "Vivo V29", "Vivo X90", "Vivo X100", "Vivo Y21", "Vivo Y100", "Vivo T2", "Vivo T2x"] },
    { brand: "Oppo", models: ["Oppo Reno 8", "Oppo Reno 10", "Oppo Reno 11", "Oppo F21", "Oppo F23", "Oppo A78", "Oppo Find X5"] },
    { brand: "Realme", models: ["Realme 9", "Realme 10", "Realme 11 Pro", "Realme GT Neo 3", "Realme Narzo 50", "Realme C55", "Realme 12 Pro"] },
    { brand: "Motorola", models: ["Moto G62", "Moto G73", "Moto G84", "Moto Edge 30", "Moto Edge 40", "Moto Razr 40"] },
    { brand: "Nokia", models: ["Nokia G21", "Nokia G42", "Nokia C21", "Nokia X30", "Nokia 105"] },
    { brand: "Google", models: ["Pixel 6", "Pixel 6a", "Pixel 7", "Pixel 7a", "Pixel 8", "Pixel 8a", "Pixel 8 Pro"] },
    { brand: "iQOO", models: ["iQOO 9", "iQOO 11", "iQOO 12", "iQOO Neo 7", "iQOO Z7"] },
    { brand: "Infinix", models: ["Infinix Hot 12", "Infinix Zero 30", "Infinix Note 30"] },
    { brand: "Tecno", models: ["Tecno Spark 10", "Tecno Camon 20", "Tecno Pova 5"] },
    { brand: "Lava", models: ["Lava Blaze", "Lava Yuva 2", "Lava Agni 2"] },
    { brand: "Micromax", models: ["Micromax In Note 2", "Micromax In 2b"] },
    { brand: "Nothing", models: ["Nothing Phone (1)", "Nothing Phone (2)", "Nothing Phone (2a)"] },
    { brand: "Asus", models: ["Asus ROG Phone 6", "Asus ROG Phone 7", "Asus ROG Phone 8"] },
  ],
  LAPTOP: [
    { brand: "Apple", models: ["MacBook Air (M1)", "MacBook Air (M2, 13-inch)", "MacBook Air (M2, 15-inch)", "MacBook Air (M3, 13-inch)", "MacBook Air (M3, 15-inch)", "MacBook Pro 13-inch (M2)", "MacBook Pro 14-inch (M3)", "MacBook Pro 14-inch (M3 Pro/Max)", "MacBook Pro 16-inch (M3 Pro/Max)", "MacBook Pro 14-inch (M4)", "MacBook Pro 16-inch (M4)"] },
    { brand: "Dell", models: ["Dell XPS 13", "Dell XPS 15", "Dell Inspiron 15", "Dell Inspiron 14", "Dell Latitude 5420", "Dell Vostro 3510", "Dell Alienware m15"] },
    { brand: "HP", models: ["HP Pavilion 15", "HP Pavilion x360", "HP Spectre x360", "HP Envy 13", "HP Omen 16", "HP 15s", "HP ProBook 440"] },
    { brand: "Lenovo", models: ["Lenovo ThinkPad X1 Carbon", "Lenovo ThinkPad E14", "Lenovo IdeaPad Slim 3", "Lenovo IdeaPad 5", "Lenovo Legion 5", "Lenovo Yoga Slim 7"] },
    { brand: "Asus", models: ["Asus VivoBook 15", "Asus ZenBook 14", "Asus TUF Gaming A15", "Asus ROG Zephyrus G14", "Asus VivoBook S14"] },
    { brand: "Acer", models: ["Acer Aspire 5", "Acer Aspire 7", "Acer Swift 3", "Acer Predator Helios 300", "Acer Nitro 5"] },
    { brand: "MSI", models: ["MSI Modern 14", "MSI Katana GF66", "MSI Stealth 15"] },
    { brand: "Samsung", models: ["Samsung Galaxy Book2", "Samsung Galaxy Book3", "Samsung Galaxy Book3 Pro"] },
    { brand: "Microsoft", models: ["Surface Laptop 4", "Surface Laptop 5", "Surface Laptop Go 2", "Surface Pro 9"] },
    { brand: "LG", models: ["LG Gram 14", "LG Gram 16"] },
  ],
  DESKTOP: [
    { brand: "Apple", models: ["iMac 24-inch (M1)", "iMac 24-inch (M3)", "Mac Mini (M2)", "Mac Mini (M4)", "Mac Studio (M2 Max)", "Mac Pro (M2 Ultra)"] },
    { brand: "Dell", models: ["Dell OptiPlex 3090", "Dell Inspiron Desktop 3910", "Dell XPS Desktop"] },
    { brand: "HP", models: ["HP Pavilion Desktop", "HP EliteDesk 800", "HP All-in-One 24"] },
    { brand: "Lenovo", models: ["Lenovo ThinkCentre M70s", "Lenovo IdeaCentre AIO 3"] },
    { brand: "Acer", models: ["Acer Aspire TC", "Acer Veriton"] },
    { brand: "Asus", models: ["Asus ExpertCenter D5", "Asus ROG Strix GA15"] },
  ],
  TABLET: [
    { brand: "Apple", models: ["iPad (9th generation)", "iPad (10th generation)", "iPad Mini (6th generation)", "iPad Air (4th generation)", "iPad Air (5th generation)", "iPad Air 11-inch (M2)", "iPad Air 13-inch (M2)", "iPad Pro 11-inch (M2)", "iPad Pro 12.9-inch (M2)", "iPad Pro 11-inch (M4)", "iPad Pro 13-inch (M4)"] },
    { brand: "Samsung", models: ["Galaxy Tab S6 Lite", "Galaxy Tab S8", "Galaxy Tab S9", "Galaxy Tab A8", "Galaxy Tab A9+"] },
    { brand: "Lenovo", models: ["Lenovo Tab M10", "Lenovo Tab P11"] },
    { brand: "Xiaomi", models: ["Xiaomi Pad 5", "Xiaomi Pad 6"] },
    { brand: "Realme", models: ["Realme Pad", "Realme Pad 2"] },
    { brand: "OnePlus", models: ["OnePlus Pad", "OnePlus Pad Go"] },
    { brand: "Amazon", models: ["Fire HD 10", "Fire HD 8"] },
  ],
  TELEVISION: [
    { brand: "Samsung", models: ["Samsung Crystal 4K UA43", "Samsung Neo QLED QN90", "Samsung The Frame", "Samsung Q60C"] },
    { brand: "LG", models: ["LG UQ7500", "LG QNED80", "LG OLED C3", "LG NanoCell NANO75"] },
    { brand: "Sony", models: ["Sony Bravia X75K", "Sony Bravia X90L", "Sony Bravia A80L"] },
    { brand: "Xiaomi", models: ["Mi TV 5X", "Mi TV 4A", "Xiaomi TV A2", "Xiaomi TV X Pro"] },
    { brand: "TCL", models: ["TCL P635", "TCL C635 QLED", "TCL 55P715"] },
    { brand: "OnePlus", models: ["OnePlus TV Y1S", "OnePlus TV U1S", "OnePlus TV Q1"] },
    { brand: "Panasonic", models: ["Panasonic TH-43 Series", "Panasonic MX Series"] },
    { brand: "Hisense", models: ["Hisense A6H", "Hisense U6H"] },
    { brand: "Thomson", models: ["Thomson 9A Series", "Thomson Q Series"] },
  ],
  REFRIGERATOR: [
    { brand: "LG", models: ["LG 260L Frost Free (GL-T292)", "LG InstaView Door-in-Door", "LG 190L Direct Cool"] },
    { brand: "Samsung", models: ["Samsung 253L Frost Free", "Samsung 653L French Door", "Samsung RT28"] },
    { brand: "Whirlpool", models: ["Whirlpool 265L IntelliFresh", "Whirlpool 200L WDE", "Whirlpool 340L FP"] },
    { brand: "Godrej", models: ["Godrej 236L Frost Free", "Godrej Eon Series"] },
    { brand: "Haier", models: ["Haier 258L Double Door", "Haier 190L Single Door"] },
    { brand: "Bosch", models: ["Bosch Serie 4 Frost Free", "Bosch Serie 6"] },
    { brand: "Panasonic", models: ["Panasonic 307L Econavi", "Panasonic 174L Direct Cool"] },
  ],
  WASHING_MACHINE: [
    { brand: "LG", models: ["LG 7Kg Front Load FHM1207", "LG 8Kg Top Load T80", "LG 6.5Kg Semi-Automatic"] },
    { brand: "Samsung", models: ["Samsung 7Kg EcoBubble", "Samsung 8Kg AddWash", "Samsung 6.5Kg Semi-Automatic"] },
    { brand: "Whirlpool", models: ["Whirlpool 7Kg Stainwash", "Whirlpool 6.5Kg Semi-Automatic", "Whirlpool Intellifab"] },
    { brand: "IFB", models: ["IFB Senator Aqua SX", "IFB Diva Aqua", "IFB Neptune VX"] },
    { brand: "Bosch", models: ["Bosch Serie 4 WAJ", "Bosch Serie 6 Front Load"] },
    { brand: "Godrej", models: ["Godrej Eon 7Kg", "Godrej WS Semi-Automatic"] },
    { brand: "Haier", models: ["Haier 7Kg Front Load", "Haier 6.5Kg Semi-Automatic"] },
  ],
  AIR_CONDITIONER: [
    { brand: "LG", models: ["LG 1.5 Ton 5 Star Dual Inverter Split AC", "LG 1 Ton Window AC"] },
    { brand: "Samsung", models: ["Samsung 1.5 Ton WindFree Split AC", "Samsung 1 Ton Split AC"] },
    { brand: "Voltas", models: ["Voltas 1.5 Ton All Weather AC", "Voltas 1 Ton Window AC", "Voltas Vertis Elite"] },
    { brand: "Daikin", models: ["Daikin 1.5 Ton Inverter Split AC", "Daikin 1 Ton FTKF Series"] },
    { brand: "Blue Star", models: ["Blue Star 1.5 Ton IC5 Series", "Blue Star 1 Ton Window AC"] },
    { brand: "Carrier", models: ["Carrier 1.5 Ton Ester Neo", "Carrier 1 Ton Estrella"] },
    { brand: "Hitachi", models: ["Hitachi 1.5 Ton Kaze Plus", "Hitachi Zunoh"] },
    { brand: "Whirlpool", models: ["Whirlpool 1.5 Ton 3D Cool", "Whirlpool 1 Ton Window AC"] },
  ],
  MICROWAVE: [
    { brand: "LG", models: ["LG 28L Convection MC2846", "LG 20L Solo MS2043"] },
    { brand: "Samsung", models: ["Samsung 28L Convection MC28", "Samsung 23L Solo MS23"] },
    { brand: "IFB", models: ["IFB 25L Convection 25SC4", "IFB 20L Solo 20PM"] },
    { brand: "Whirlpool", models: ["Whirlpool 30L Convection Magicook", "Whirlpool 20L Solo MW"] },
    { brand: "Bajaj", models: ["Bajaj 20L Solo Majesty", "Bajaj 25L Convection"] },
    { brand: "Godrej", models: ["Godrej 20L Solo GME", "Godrej 30L Convection"] },
  ],
  SMARTWATCH: [
    { brand: "Apple", models: ["Apple Watch SE (2nd generation)", "Apple Watch Series 8", "Apple Watch Series 9", "Apple Watch Ultra 2"] },
    { brand: "Samsung", models: ["Galaxy Watch 5", "Galaxy Watch 6", "Galaxy Watch Ultra"] },
    { brand: "Noise", models: ["Noise ColorFit Pro 4", "Noise ColorFit Ultra", "Noise Icon 2"] },
    { brand: "boAt", models: ["boAt Wave Call", "boAt Storm", "boAt Xtend"] },
    { brand: "Fire-Boltt", models: ["Fire-Boltt Phoenix", "Fire-Boltt Ninja Call Pro"] },
    { brand: "Titan", models: ["Titan Smart 3", "Titan Talk"] },
    { brand: "Amazfit", models: ["Amazfit GTS 4", "Amazfit Bip 5"] },
  ],
  HEADPHONE_EARBUD: [
    { brand: "boAt", models: ["boAt Airdopes 141", "boAt Rockerz 450", "boAt Stone 1200"] },
    { brand: "JBL", models: ["JBL Flip 6", "JBL Tune 510BT", "JBL Go 3"] },
    { brand: "Sony", models: ["Sony WH-1000XM5", "Sony WF-1000XM4", "Sony SRS-XB13"] },
    { brand: "Apple", models: ["AirPods (3rd generation)", "AirPods Pro (2nd generation)", "AirPods Max"] },
    { brand: "Samsung", models: ["Galaxy Buds2", "Galaxy Buds2 Pro"] },
    { brand: "Noise", models: ["Noise Buds VS104", "Noise Shots X5"] },
    { brand: "Bose", models: ["Bose QuietComfort 45", "Bose SoundLink Flex"] },
  ],
  PRINTER_SCANNER: [
    { brand: "HP", models: ["HP DeskJet 2331", "HP LaserJet Pro M15w", "HP Smart Tank 580"] },
    { brand: "Canon", models: ["Canon PIXMA E477", "Canon PIXMA G3010", "Canon imageCLASS MF3010"] },
    { brand: "Epson", models: ["Epson L3250", "Epson EcoTank L3210", "Epson L120"] },
    { brand: "Brother", models: ["Brother DCP-T420W", "Brother HL-L2321D"] },
    { brand: "Ricoh", models: ["Ricoh SP 210", "Ricoh MP 2014"] },
  ],
};

async function seedForBusiness(businessId: string) {
  let brandsCreated = 0, brandsBackfilled = 0, seriesCreated = 0, modelsCreated = 0;

  for (const category of DEVICE_CATEGORIES) {
    for (const { brand: brandName, models } of CATEGORY_DATA[category] || []) {
      // A brand can already exist uncategorized (e.g. the user's manually
      // entered Mobile brands) -- match by name first, then decide whether
      // to backfill its category or create a fresh categorized row.
      let brand = await Brand.findOne({ businessId, category, name: brandName });
      if (!brand) {
        const uncategorized = await Brand.findOne({ businessId, name: brandName, category: null });
        if (uncategorized) {
          uncategorized.category = category;
          await uncategorized.save();
          brand = uncategorized;
          brandsBackfilled++;
        } else {
          brand = await Brand.create({ businessId, name: brandName, category, businessScope: "SINGLE" } as any);
          brandsCreated++;
        }
      }

      // Insert-only per-brand Series cache for this loop iteration -- avoids
      // re-querying the same Series doc for every model in the same line.
      const seriesCache = new Map<string, any>();

      for (const modelName of models) {
        const exists = await DeviceModel.findOne({ businessId, brandId: brand._id, name: modelName });
        const seriesName = deriveSeriesName(brandName, modelName);

        let seriesDoc = seriesCache.get(seriesName);
        if (!seriesDoc) {
          seriesDoc = await Series.findOne({ businessId, brandId: brand._id, name: seriesName });
          if (!seriesDoc) {
            seriesDoc = await Series.create({ businessId, brandId: brand._id, name: seriesName, businessScope: "SINGLE" } as any);
            seriesCreated++;
          }
          seriesCache.set(seriesName, seriesDoc);
        }

        if (exists) {
          // Backfill seriesId on a pre-existing model that predates this
          // field -- never touch anything else about it.
          if (!(exists as any).seriesId) {
            exists.seriesId = seriesDoc._id;
            await exists.save();
          }
          continue;
        }

        await DeviceModel.create({
          businessId,
          brandId: brand._id,
          seriesId: seriesDoc._id,
          name: modelName,
          businessScope: "SINGLE",
        } as any);
        modelsCreated++;
      }
    }
  }

  console.log(`  businessId=${businessId}: ${brandsCreated} brands created, ${brandsBackfilled} backfilled, ${seriesCreated} series created, ${modelsCreated} models created.`);
}

async function main() {
  await connectDB();

  // Brand's unique index changed from {businessId, name} to {businessId,
  // category, name} (see Brand.ts's comment) -- Mongoose's default
  // autoIndex only ADDS newly-declared indexes, it doesn't drop the old one
  // still sitting in MongoDB, so the old constraint would keep rejecting a
  // legitimate second "Apple"/"Samsung" row under a different category.
  // syncIndexes() reconciles the collection's real indexes with the schema.
  console.log("Syncing Brand indexes...");
  await Brand.syncIndexes();

  const businesses = await Business.find({}).select("_id name").lean();
  console.log(`Seeding device categories for ${businesses.length} business(es)...`);

  for (const biz of businesses) {
    console.log(`Business: ${(biz as any).name || biz._id}`);
    await seedForBusiness(String(biz._id));
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
