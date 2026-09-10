#!/usr/bin/env node
// Seeds a full, realistic local-dev marketplace dataset: 20 APPROVED
// showrooms (real business data, availability, YouTube videos), 10-15
// ACTIVE vehicles each (real make/model/spec variety, ~half with financing
// configured), homepage TikTok/YouTube highlights + the social system
// settings that back them, 15 customers, and a spread of appointments,
// vehicle inquiries, and financing applications across them.
//
// This script only ever ADDS data — it does not wipe anything itself. To
// start from a genuinely clean database first, run:
//   npx supabase db reset --local
// (reapplies every migration, including the brands/models/vehicle_types
// catalog seed migration, and wipes every user/row) — then run this
// script, then scripts/seed-admin.mjs (or use this script's own admin
// bootstrap below, which does the same thing with a fixed local-only
// password for convenience).
//
// Same safety rules as the other scripts/seed-*.mjs: local Supabase only
// unless explicitly overridden, credentials never written to a file, only
// printed once to the terminal. Vehicle photos, showroom logos, and the
// homepage highlight thumbnail are real photos fetched from Unsplash's
// direct CDN (images.unsplash.com/photo-<id> — the old source.unsplash.com
// redirect service is deprecated) using a small pool of known, verified
// photo ids, downloaded once and re-uploaded to the same local Supabase
// Storage buckets/paths the app itself uses (vehicle-media, showroom-logos,
// homepage-highlights) — free to use under the Unsplash License. Brand
// logos (BMW, Toyota, etc.) come from real local image files placed under
// /brands-logo instead, uploaded to the brand-logos bucket. Video URLs are
// structurally valid but plausible placeholders (same convention
// e2e/homepage-highlights.spec.ts already uses for its own TikTok/YouTube
// test fixtures), not real third-party content.
//
// Usage:
//   npm run seed:marketplace

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Is .env.local populated?");
  process.exit(1);
}

const isLocalUrl = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(supabaseUrl);
if (!isLocalUrl && process.env.SEED_MARKETPLACE_ALLOW_REMOTE !== "true") {
  console.error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL (${supabaseUrl}) is not a local Supabase instance.`);
  console.error("Set SEED_MARKETPLACE_ALLOW_REMOTE=true to explicitly override this check.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = "admin@harakagari.local";
// Hardcoded defaults are fine for local dev (this repo is public on
// GitHub, so they're already effectively public) — but a run against a
// real remote database (SEED_MARKETPLACE_ALLOW_REMOTE=true) must not hand
// out admin/owner/customer logins to anyone who reads the source. These
// env var overrides let a remote run supply fresh, one-off passwords
// instead, generated and passed in by the caller, never committed.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "TestingAdmin!123";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || "TestingOwner!123";
const CUSTOMER_PASSWORD = process.env.SEED_CUSTOMER_PASSWORD || "TestingCustomer!123";

if (!isLocalUrl && (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_OWNER_PASSWORD || !process.env.SEED_CUSTOMER_PASSWORD)) {
  console.error("Refusing to run against a remote database with the hardcoded default passwords (they're public — this repo is public on GitHub).");
  console.error("Set SEED_ADMIN_PASSWORD, SEED_OWNER_PASSWORD, and SEED_CUSTOMER_PASSWORD to fresh, non-committed values first.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Real-world-shaped reference data
// ---------------------------------------------------------------------------

const SHOWROOMS = [
  { name: "Nairobi Prime Motors", city: "Nairobi", address: "Mombasa Road" },
  { name: "Coastal Auto Gallery", city: "Mombasa", address: "Nyali Road" },
  { name: "Lakeview Car Bazaar", city: "Kisumu", address: "Oginga Odinga Street" },
  { name: "Rift Valley Motors", city: "Nakuru", address: "Kenyatta Avenue" },
  { name: "Eldoret Auto Hub", city: "Eldoret", address: "Uganda Road" },
  { name: "Thika Road Motors", city: "Nairobi", address: "Thika Road" },
  { name: "Mount Kenya Autos", city: "Nyeri", address: "Kimathi Way" },
  { name: "Machakos Car Centre", city: "Machakos", address: "Mumbuni Road" },
  { name: "Highland Auto Deals", city: "Kericho", address: "Moi Highway" },
  { name: "Kitale Motors World", city: "Kitale", address: "Kenyatta Street" },
  { name: "Westlands Premium Cars", city: "Nairobi", address: "Waiyaki Way" },
  { name: "Karen Executive Motors", city: "Nairobi", address: "Karen Road" },
  { name: "Mombasa Road Auto Mart", city: "Mombasa", address: "Moi Avenue" },
  { name: "Nyali Car Showroom", city: "Mombasa", address: "Links Road" },
  { name: "Kisumu City Motors", city: "Kisumu", address: "Kakamega Road" },
  { name: "Nakuru Auto Junction", city: "Nakuru", address: "Nairobi Road" },
  { name: "Eldoret Prestige Cars", city: "Eldoret", address: "Iten Road" },
  { name: "Ngong Road Motors", city: "Nairobi", address: "Ngong Road" },
  { name: "Industrial Area Auto Deals", city: "Nairobi", address: "Enterprise Road" },
  { name: "Milimani Car Gallery", city: "Kisumu", address: "Milimani Estate" },
];

// vehicles.make/model are plain text (not FK'd to the brands/models catalog
// tables) — real, common Kenyan-market makes/models/price-tier ranges, not
// limited to the ~10 catalog rows so 200+ generated vehicles have genuine
// variety, matching how a real marketplace's free-text listings would look.
const MAKE_MODELS = [
  { make: "Toyota", models: ["Corolla", "Camry", "RAV4", "Land Cruiser Prado", "Hilux", "Fortuner", "Vitz", "Premio", "Harrier", "Axio"], tier: "mid" },
  { make: "Honda", models: ["Civic", "CR-V", "Fit", "Accord"], tier: "mid" },
  { make: "Nissan", models: ["X-Trail", "Note", "Navara", "Juke"], tier: "mid" },
  { make: "Mazda", models: ["CX-5", "Demio", "Axela"], tier: "mid" },
  { make: "Subaru", models: ["Forester", "Outback", "Impreza"], tier: "mid" },
  { make: "Mercedes-Benz", models: ["C-Class", "E-Class", "GLC", "GLE"], tier: "premium" },
  { make: "BMW", models: ["3 Series", "5 Series", "X3", "X5"], tier: "premium" },
  { make: "Audi", models: ["A4", "Q5", "A6"], tier: "premium" },
  { make: "Volkswagen", models: ["Golf", "Tiguan", "Polo"], tier: "mid" },
  { make: "Hyundai", models: ["Tucson", "Elantra", "i10", "Santa Fe"], tier: "budget" },
  { make: "Range Rover", models: ["Evoque", "Sport", "Vogue"], tier: "luxury" },
  { make: "Mitsubishi", models: ["Outlander", "Pajero", "Lancer"], tier: "mid" },
  { make: "Isuzu", models: ["D-Max", "MU-X"], tier: "mid" },
  { make: "Kia", models: ["Sportage", "Sorento"], tier: "budget" },
];

const PRICE_RANGE_BY_TIER = {
  budget: [900_000, 2_500_000],
  mid: [1_500_000, 6_500_000],
  premium: [4_500_000, 12_000_000],
  luxury: [8_000_000, 18_000_000],
};

const BODY_TYPES = ["Sedan", "SUV", "Coupe", "Hatchback", "Pickup", "Convertible", "Wagon"];
const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
const TRANSMISSIONS = ["Manual", "Automatic", "CVT"];
const COLORS = ["Pearl White", "Jet Black", "Silver", "Grey", "Navy Blue", "Maroon", "Champagne Gold"];

// Real Unsplash photo ids (verified live against images.unsplash.com before
// writing this list — a nonexistent id 404s on that CDN, so every id below
// is a genuine, currently-served photo, not a guess). Reused across many
// vehicles/showrooms — a dev seed doesn't need a unique photo per row, and
// caching each id's bytes once (below) keeps this to a couple dozen network
// calls no matter how many vehicles get seeded.
const VEHICLE_PHOTO_IDS = [
  "1494905998402-395d579af36f",
  "1503376780353-7e6692767b70",
  "1552519507-da3b142c6e3d",
  "1494976388531-d1058494cdd8",
  "1533473359331-0135ef1b58bf",
  "1583121274602-3e2820c69888",
  "1605559911160-a3d95d213904",
  "1493238792000-8113da705763",
  "1541899481282-d53bffe3c35d",
  "1571607388263-1044f9ea01dd",
  "1502877338535-766e1452684a",
  "1580273916550-e323be2ae537",
  "1592840062661-a5a7f78e2056",
  "1511919884226-fd3cad34687c",
  "1600661653561-629509216228",
  "1614200187524-dc4b892acf16",
  "1616422285623-13ff0162193c",
  "1550355291-bbee04a92027",
  "1607853202273-797f1c22a38e",
  "1601362840469-51e4d8d58785",
  "1618843479313-40f8afb4b4d8",
  "1567818735868-e71b99932e29",
  "1568844293986-8d0400bd4745",
  "1626668893632-6f3a4466d22f",
  "1552642986-ccb41e7059e7",
  "1606152421802-db97b9c7a11b",
  "1517524008697-84bbe3c3fd98",
  "1503736334956-4c8f8e92946d",
];
const SHOWROOM_LOGO_PHOTO_IDS = VEHICLE_PHOTO_IDS.slice(0, 8);
const HIGHLIGHT_THUMBNAIL_PHOTO_ID = "1494976388531-d1058494cdd8";

// Real brand logo files supplied locally (project root /brands-logo) —
// mapped to the exact `brands` catalog rows seeded by
// supabase/migrations/20260905010002_seed_catalog_data.sql. Only brands
// with a matching file get a logo; "Range Rover" has no file in that
// folder, so it's deliberately left without one rather than faked.
const BRAND_LOGO_FILES = {
  BMW: "bmw.jpeg",
  "Mercedes-Benz": "mercedes.jpeg",
  Audi: "audi.jpeg",
  Toyota: "toyota.jpeg",
  Porsche: "porche.jpeg",
  Tesla: "tesla.png",
  Honda: "honda.jpeg",
  Hyundai: "hundai.jpeg",
  Volkswagen: "vw.jpeg",
};
function mimeTypeForFile(filename) {
  return filename.endsWith(".png") ? "image/png" : "image/jpeg";
}

function unsplashUrl(id, params) {
  return `https://images.unsplash.com/photo-${id}?${new URLSearchParams(params).toString()}`;
}

// The Unsplash CDN fetch is occasionally flaky under many parallel
// connections (transient "fetch failed" with no HTTP response at all) —
// retry a few times with a short backoff before giving up for real.
async function fetchImageBytes(url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch seed image ${url}: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error("unreachable");
}

/** Runs `fn` over `items` with at most `limit` in flight at once — the Unsplash
 * CDN fetch above is more reliable at modest concurrency than firing all
 * requests via a single Promise.all. */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Picks `n` distinct random entries from `arr` (n capped at arr.length). */
function pickDistinct(arr, n) {
  const pool = [...arr];
  const result = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    result.push(pool.splice(randomInt(0, pool.length - 1), 1)[0]);
  }
  return result;
}

const CUSTOMER_FIRST_NAMES = [
  "John", "Grace", "Peter", "Mary", "James", "Faith", "David", "Ann", "Samuel", "Joyce",
  "Daniel", "Lucy", "Michael", "Esther", "Joseph", "Rose", "Kevin", "Mercy", "Brian", "Nancy",
];
const CUSTOMER_LAST_NAMES = [
  "Mwangi", "Wanjiru", "Otieno", "Achieng", "Kamau", "Njeri", "Kiptoo", "Chebet", "Omondi", "Adhiambo",
  "Kariuki", "Wambui", "Barasa", "Nyambura", "Mutua", "Wairimu", "Korir", "Cherono", "Mbugua", "Akinyi",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
// Same slugify() as src/features/vehicle/slug.ts — duplicated (plain Node
// ESM script, no TS loader configured) rather than imported.
function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function randomDigits(length) {
  let s = "";
  for (let i = 0; i < length; i++) s += randomInt(0, 9);
  return s;
}
function randomYoutubeId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let s = "";
  for (let i = 0; i < 11; i++) s += chars[randomInt(0, chars.length - 1)];
  return s;
}

// ---------------------------------------------------------------------------
// Auth helpers (same convention as scripts/seed-test-data.mjs)
// ---------------------------------------------------------------------------

let userCache = null;
async function listAllUsers() {
  if (userCache) return userCache;
  const users = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  userCache = users;
  return users;
}

async function ensureUser(email, password, fullName) {
  const users = await listAllUsers();
  const existing = users.find((u) => u.email === email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { password });
    if (fullName) await supabase.from("profiles").update({ full_name: fullName }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error || !data.user) throw error ?? new Error(`Failed to create ${email}`);
  userCache.push(data.user);
  if (fullName) await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
  return data.user.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding a full local-dev marketplace dataset — this can take a minute...\n");

  // --- Admin -----------------------------------------------------------
  const adminId = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, "Platform Admin");
  await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);
  console.log("✅ Admin ready.");

  // --- Global system settings (WhatsApp + homepage TikTok/YouTube) -----
  await supabase.from("system_settings").update({ value: "254712000111" }).eq("key", "whatsapp_contact_number");
  await supabase.from("system_settings").update({ value: "https://www.tiktok.com/@harakagari" }).eq("key", "homepage_tiktok_profile_url");
  await supabase.from("system_settings").update({ value: "https://www.youtube.com/@harakagari" }).eq("key", "homepage_youtube_channel_url");
  console.log("✅ Global WhatsApp/TikTok/YouTube settings configured.");

  // --- Real photo pools (fetched once, reused across many rows) ---------
  console.log("Downloading Unsplash photo pool (vehicles, showroom logos, highlight thumbnail)...");
  const vehiclePhotoEntries = await mapWithConcurrency(VEHICLE_PHOTO_IDS, 6, async (id) => [
    id,
    await fetchImageBytes(unsplashUrl(id, { w: "1200", q: "75", fm: "jpg", fit: "crop", auto: "format" })),
  ]);
  const vehiclePhotoBytesById = new Map(vehiclePhotoEntries);
  const logoPhotoEntries = await mapWithConcurrency(SHOWROOM_LOGO_PHOTO_IDS, 6, async (id) => [
    id,
    await fetchImageBytes(unsplashUrl(id, { w: "400", h: "400", q: "75", fm: "jpg", fit: "crop", auto: "format" })),
  ]);
  const logoPhotoBytesById = new Map(logoPhotoEntries);
  console.log(`✅ ${vehiclePhotoBytesById.size} vehicle photos + ${logoPhotoBytesById.size} logo photos downloaded.`);

  // --- Real brand logos (local files under /brands-logo) ----------------
  const { data: brandRows } = await supabase.from("brands").select("id, name");
  let brandLogoCount = 0;
  for (const brand of brandRows ?? []) {
    const fileName = BRAND_LOGO_FILES[brand.name];
    if (!fileName) {
      console.warn(`⚠️  No local logo file mapped for brand "${brand.name}" — leaving it without a logo.`);
      continue;
    }
    // brands-logo/ is gitignored (local source assets, not shipped in the
    // repo) — skip gracefully rather than aborting the whole seed run on a
    // fresh clone that doesn't have it.
    let bytes;
    try {
      bytes = await readFile(new URL(`../brands-logo/${fileName}`, import.meta.url));
    } catch {
      console.warn(`⚠️  brands-logo/${fileName} not found — skipping ${brand.name}'s logo.`);
      continue;
    }
    const path = `${brand.id}/logo-seed.${fileName.split(".").pop()}`;
    const { error: brandLogoUploadError } = await supabase.storage
      .from("brand-logos")
      .upload(path, bytes, { contentType: mimeTypeForFile(fileName), upsert: true });
    if (brandLogoUploadError) throw brandLogoUploadError;
    await supabase.from("brands").update({ logo_storage_path: path }).eq("id", brand.id);
    brandLogoCount += 1;
  }
  console.log(`✅ ${brandLogoCount} brand logos uploaded.`);

  // --- Homepage highlights (TikTok + YouTube), with a real thumbnail ---
  // upload so the cards render an actual image, not a broken link.
  const thumbnailBytes = await fetchImageBytes(
    unsplashUrl(HIGHLIGHT_THUMBNAIL_PHOTO_ID, { w: "800", q: "75", fm: "jpg", fit: "crop", auto: "format" }),
  );
  const thumbnailPath = "seed/highlight-thumbnail.jpg";
  const { error: thumbnailUploadError } = await supabase.storage
    .from("homepage-highlights")
    .upload(thumbnailPath, thumbnailBytes, { contentType: "image/jpeg", upsert: true });
  if (thumbnailUploadError) throw thumbnailUploadError;

  await supabase.from("homepage_highlights").delete().like("title", "Seed:%");
  const highlightRows = [
    ...["Top 5 Deals This Week", "Showroom Tour: Westlands", "How to Spot a Good Deal", "Customer Reviews Roundup"].map((title, i) => ({
      platform: "TIKTOK",
      title: `Seed: ${title}`,
      video_url: `https://www.tiktok.com/@harakagari/video/7${randomDigits(18)}`,
      thumbnail_storage_path: thumbnailPath,
      sort_order: i,
      is_active: true,
      created_by: adminId,
    })),
    ...["Test Drive: Toyota Land Cruiser", "Buying Guide: Bank Finance vs HP", "Showroom Spotlight: Coastal Auto Gallery", "Customer Story: First Car Purchase"].map(
      (title, i) => ({
        platform: "YOUTUBE",
        title: `Seed: ${title}`,
        video_url: `https://www.youtube.com/watch?v=${randomYoutubeId()}`,
        thumbnail_storage_path: thumbnailPath,
        sort_order: i,
        is_active: true,
        created_by: adminId,
      }),
    ),
  ];
  await supabase.from("homepage_highlights").insert(highlightRows);
  console.log(`✅ ${highlightRows.length} homepage highlights (TikTok + YouTube).`);

  // --- Showrooms, vehicles, availability, videos ------------------------
  const allVehicleIds = []; // [{ id, showroomId, price, financingEnabled }]
  const allShowrooms = []; // [{ id, businessName, ownerEmail }]

  for (let i = 0; i < SHOWROOMS.length; i++) {
    const s = SHOWROOMS[i];
    const ownerEmail = `owner${i + 1}@harakagari.local`;
    const ownerId = await ensureUser(ownerEmail, OWNER_PASSWORD, `${s.name} Owner`);

    const slug = slugify(s.name);
    const verified = i % 3 !== 0; // most verified, a few not — realistic mix

    const { data: existing } = await supabase.from("showrooms").select("id").eq("owner_user_id", ownerId).maybeSingle();
    let showroomId = existing?.id;
    const showroomFields = {
      business_name: s.name,
      description: `${s.name} is a certified HarakaGari showroom based in ${s.city}, offering a wide range of quality vehicles with bank finance and hire-purchase options available.`,
      phone: `+2547${randomDigits(8)}`,
      email: ownerEmail,
      address: s.address,
      city: s.city,
      opening_hours: "Mon-Sat 08:00-18:00",
      status: "APPROVED",
      verified,
      slot_duration_minutes: pick([30, 45]),
      buffer_minutes: pick([0, 15]),
      youtube_channel_url: i % 2 === 0 ? `https://www.youtube.com/@${slug}` : null,
    };
    if (showroomId) {
      await supabase.from("showrooms").update(showroomFields).eq("id", showroomId);
    } else {
      const { data, error } = await supabase.from("showrooms").insert({ owner_user_id: ownerId, ...showroomFields }).select("id").single();
      if (error || !data) throw error ?? new Error(`showroom ${s.name} not created`);
      showroomId = data.id;
    }
    allShowrooms.push({ id: showroomId, businessName: s.name, ownerEmail });

    // Logo — stable path keyed off showroomId (which is itself stable
    // across reruns via the find-or-create above), so upsert:true keeps
    // this idempotent rather than accumulating storage orphans.
    const logoId = SHOWROOM_LOGO_PHOTO_IDS[i % SHOWROOM_LOGO_PHOTO_IDS.length];
    const logoPath = `${showroomId}/logo-seed.jpg`;
    const { error: showroomLogoUploadError } = await supabase.storage
      .from("showroom-logos")
      .upload(logoPath, logoPhotoBytesById.get(logoId), { contentType: "image/jpeg", upsert: true });
    if (showroomLogoUploadError) throw showroomLogoUploadError;
    await supabase.from("showrooms").update({ logo_storage_path: logoPath }).eq("id", showroomId);

    // Mon-Sat availability, real slots so appointment booking is fully live.
    await supabase.from("showroom_availability").delete().eq("showroom_id", showroomId);
    await supabase.from("showroom_availability").insert(
      [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        showroom_id: showroomId,
        day_of_week: dayOfWeek,
        start_time: "08:00",
        end_time: "18:00",
        is_available: true,
      })),
    );

    // 2 YouTube videos per showroom.
    await supabase.from("showroom_videos").delete().eq("showroom_id", showroomId);
    await supabase.from("showroom_videos").insert([
      { showroom_id: showroomId, title: `${s.name} — Showroom Walkthrough`, video_url: `https://www.youtube.com/watch?v=${randomYoutubeId()}`, sort_order: 0 },
      { showroom_id: showroomId, title: `${s.name} — Customer Testimonials`, video_url: `https://www.youtube.com/watch?v=${randomYoutubeId()}`, sort_order: 1 },
    ]);

    // 10-15 ACTIVE vehicles, real make/model/spec variety. Delete this
    // showroom's own previously-seeded vehicles first — unlike showrooms/
    // availability/videos (each find-or-create or delete-then-insert
    // already), a re-run without a fresh `supabase db reset` would
    // otherwise insert a second full batch on top of the first with no way
    // to tell old from new (confirmed live: an interrupted-and-rerun pass
    // produced 514 vehicles instead of ~263 before this fix).
    await supabase.from("vehicles").delete().eq("showroom_id", showroomId);
    const vehicleCount = randomInt(10, 15);
    const rows = [];
    for (let v = 0; v < vehicleCount; v++) {
      const group = pick(MAKE_MODELS);
      const model = pick(group.models);
      const year = randomInt(2015, 2025);
      const [minPrice, maxPrice] = PRICE_RANGE_BY_TIER[group.tier];
      const price = Math.round(randomInt(minPrice, maxPrice) / 10_000) * 10_000;
      const hasFinancing = Math.random() < 0.6;
      rows.push({
        showroom_id: showroomId,
        title: `${year} ${group.make} ${model}`,
        make: group.make,
        model,
        year,
        price,
        mileage: randomInt(5_000, 150_000),
        fuel_type: pick(FUEL_TYPES),
        transmission: pick(TRANSMISSIONS),
        body_type: pick(BODY_TYPES),
        color: pick(COLORS),
        description: `Well-maintained ${year} ${group.make} ${model} available at ${s.name}, ${s.city}. Genuine mileage, full service history.`,
        status: "ACTIVE",
        // Always explicit (not conditionally spread) — a batch .insert()
        // builds one combined column set across the whole array, so a row
        // missing a key that other rows in the same batch DO have gets an
        // explicit NULL sent for it rather than falling through to the
        // column's own DB-level DEFAULT, which then fails NOT NULL.
        installment_enabled: hasFinancing,
        bank_finance_enabled: hasFinancing,
        ...(hasFinancing
          ? {
              financing_down_payment_percent: pick([10, 15, 20, 25]),
              financing_interest_rate: randomInt(12, 16),
              financing_tenure_options_months: [12, 24, 36, 48],
              financing_partner: "HarakaGari Finance Partners",
              financing_insurance_percent: pick([2, 3, 4]),
            }
          : {}),
      });
    }
    const { data: insertedVehicles, error: vehicleError } = await supabase.from("vehicles").insert(rows).select("id, price");
    if (vehicleError || !insertedVehicles) throw vehicleError ?? new Error(`vehicles for ${s.name} not created`);

    for (const v of insertedVehicles) {
      allVehicleIds.push({ id: v.id, showroomId, price: v.price });
    }

    // 2-3 real photos per vehicle, uploaded with modest concurrency (each
    // vehicle's own uploads still happen in order, since sort_order/
    // is_primary depend on it). Storage paths are keyed on the vehicle's
    // position within this showroom (not its id), so a rerun's freshly
    // generated vehicle ids still land on the same paths — upsert:true then
    // keeps this idempotent instead of orphaning a new batch of objects
    // every run, matching how the showroom/brand logo paths already work.
    // Vehicles themselves are always freshly re-inserted (deleted above),
    // so vehicle_media rows never need their own cleanup — the FK's
    // `on delete cascade` already removed the prior batch's rows along with
    // the vehicles themselves.
    await mapWithConcurrency(insertedVehicles, 6, async (v, vehicleIndex) => {
      const photoIds = pickDistinct(VEHICLE_PHOTO_IDS, randomInt(2, 3));
      const mediaRows = [];
      for (let idx = 0; idx < photoIds.length; idx++) {
        const storagePath = `${showroomId}/vehicle-${vehicleIndex}/seed-${idx}.jpg`;
        const { error: vehiclePhotoUploadError } = await supabase.storage
          .from("vehicle-media")
          .upload(storagePath, vehiclePhotoBytesById.get(photoIds[idx]), { contentType: "image/jpeg", upsert: true });
        if (vehiclePhotoUploadError) throw vehiclePhotoUploadError;
        mediaRows.push({ vehicle_id: v.id, storage_path: storagePath, sort_order: idx, is_primary: idx === 0 });
      }
      const { error: mediaError } = await supabase.from("vehicle_media").insert(mediaRows);
      if (mediaError) throw mediaError;
    });

    console.log(`✅ ${s.name} (${s.city}) — ${vehicleCount} vehicles with photos, logo, availability, 2 videos.`);
  }

  // --- Customers ---------------------------------------------------------
  const customers = [];
  const customerCount = randomInt(15, 20);
  for (let i = 0; i < customerCount; i++) {
    const first = CUSTOMER_FIRST_NAMES[i % CUSTOMER_FIRST_NAMES.length];
    const last = pick(CUSTOMER_LAST_NAMES);
    const email = `customer${i + 1}@harakagari.local`;
    const id = await ensureUser(email, CUSTOMER_PASSWORD, `${first} ${last}`);
    await supabase.from("profiles").update({ phone: `+2547${randomDigits(8)}` }).eq("id", id);
    customers.push({ id, fullName: `${first} ${last}`, email, phone: `+2547${randomDigits(8)}` });
  }
  console.log(`✅ ${customers.length} customers.`);

  // --- Appointments (spread across statuses, collision-free slots) ------
  // Only clean up this script's own previously-seeded rows (a re-run
  // without a fresh `supabase db reset` shouldn't touch anyone else's
  // appointments) — appointment_vehicles has no booking_reference of its
  // own, so its seed rows are found via their parent appointment ids first.
  const { data: previousSeedAppointments } = await supabase.from("appointments").select("id").like("booking_reference", "BK-SEED-%");
  const previousSeedAppointmentIds = (previousSeedAppointments ?? []).map((a) => a.id);
  if (previousSeedAppointmentIds.length > 0) {
    await supabase.from("appointment_vehicles").delete().in("appointment_id", previousSeedAppointmentIds);
    await supabase.from("appointments").delete().in("id", previousSeedAppointmentIds);
  }
  const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED", "RESCHEDULED"];
  let appointmentSeq = 0;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 3); // a few days out, always in the future

  for (const showroom of allShowrooms) {
    const vehiclesHere = allVehicleIds.filter((v) => v.showroomId === showroom.id);
    const appointmentCount = randomInt(2, 4);
    for (let a = 0; a < appointmentCount; a++) {
      appointmentSeq += 1;
      const customer = pick(customers);
      const vehicle = pick(vehiclesHere);
      const date = new Date(baseDate);
      date.setDate(date.getDate() + appointmentSeq); // each appointment on its own day — guarantees no overlap
      const dateStr = date.toISOString().slice(0, 10);
      const startHour = randomInt(9, 15);
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endTime = `${String(startHour).padStart(2, "0")}:30`;
      const status = pick(APPOINTMENT_STATUSES);

      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          booking_reference: `BK-SEED-${String(appointmentSeq).padStart(4, "0")}`,
          customer_id: customer.id,
          showroom_id: showroom.id,
          appointment_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          status,
          contact_name: customer.fullName,
          contact_email: customer.email,
          contact_phone: customer.phone,
          customer_notes: "Interested in a test drive, seeded demo data.",
        })
        .select("id")
        .single();
      if (error || !appt) throw error ?? new Error("appointment not created");
      await supabase.from("appointment_vehicles").insert({ appointment_id: appt.id, vehicle_id: vehicle.id });
    }
  }
  console.log(`✅ ${appointmentSeq} appointments.`);

  // --- Vehicle inquiries ---------------------------------------------------
  await supabase.from("vehicle_inquiries").delete().like("message", "Seed:%");
  const INQUIRY_MESSAGES = [
    "Is this vehicle still available? I'd like to know the lowest price.",
    "Can I get more photos of the interior?",
    "Does this come with a warranty?",
    "What's the mileage and service history?",
    "Is the price negotiable?",
  ];
  let inquiryCount = 0;
  for (const showroom of allShowrooms) {
    const vehiclesHere = allVehicleIds.filter((v) => v.showroomId === showroom.id);
    const n = randomInt(2, 3);
    for (let i = 0; i < n; i++) {
      const customer = pick(customers);
      const vehicle = pick(vehiclesHere);
      const { error } = await supabase.from("vehicle_inquiries").insert({
        vehicle_id: vehicle.id,
        showroom_id: showroom.id,
        customer_id: customer.id,
        contact_name: customer.fullName,
        contact_email: customer.email,
        contact_phone: customer.phone,
        message: `Seed: ${pick(INQUIRY_MESSAGES)}`,
        status: pick(["NEW", "VIEWED"]),
      });
      if (error) throw error;
      inquiryCount += 1;
    }
  }
  console.log(`✅ ${inquiryCount} vehicle inquiries.`);

  // --- Financing applications ----------------------------------------------
  await supabase.from("financing_applications").delete().eq("national_id", "SEED00000");
  let financingCount = 0;
  for (const showroom of allShowrooms) {
    const vehiclesHere = allVehicleIds.filter((v) => v.showroomId === showroom.id);
    const n = randomInt(1, 2);
    for (let i = 0; i < n; i++) {
      const customer = pick(customers);
      const vehicle = pick(vehiclesHere);
      const { error } = await supabase.from("financing_applications").insert({
        vehicle_id: vehicle.id,
        showroom_id: showroom.id,
        customer_id: customer.id,
        contact_name: customer.fullName,
        contact_email: customer.email,
        contact_phone: customer.phone,
        employment_status: pick(["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER"]),
        monthly_income: randomInt(80_000, 500_000),
        national_id: "SEED00000",
        desired_down_payment: Math.round(vehicle.price * 0.2),
        desired_tenure_months: pick([12, 24, 36, 48]),
        notes: "Seed: demo financing application.",
        status: pick(["NEW", "VIEWED"]),
      });
      if (error) throw error;
      financingCount += 1;
    }
  }
  console.log(`✅ ${financingCount} financing applications.`);

  console.log("\n🎉 Full marketplace dataset ready.\n");
  console.log("Admin login    → http://localhost:3000/admin/login");
  console.log(`   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("\nShowroom owner logins → http://localhost:3000/login (all use the same password)");
  console.log(`   owner1@harakagari.local .. owner${SHOWROOMS.length}@harakagari.local / ${OWNER_PASSWORD}`);
  console.log("\nCustomer logins → http://localhost:3000/login (all use the same password)");
  console.log(`   customer1@harakagari.local .. customer${customers.length}@harakagari.local / ${CUSTOMER_PASSWORD}`);
  console.log(`\n${SHOWROOMS.length} showrooms, ${allVehicleIds.length} vehicles, ${appointmentSeq} appointments,`);
  console.log(`${inquiryCount} inquiries, ${financingCount} financing applications, ${highlightRows.length} homepage highlights.`);
  console.log("\nThis is local-dev demo data only — fixed credentials, never use against a real deployment.\n");
}

main().catch((error) => {
  console.error("Failed to seed marketplace data:", error.message ?? error);
  process.exit(1);
});
