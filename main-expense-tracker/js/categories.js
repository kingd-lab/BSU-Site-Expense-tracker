/**
 * categories.js — the expense category taxonomy.
 *
 * CATEGORY_GROUPS drives both the Add Expense dropdown AND the Excel/PDF
 * export grouping — they're the same groups now, based on the site
 * team's own breakdown:
 *   1. Accommodation
 *   2. Block Production (Store, Cement, Burnt Bricks, Water, Sharp Sand)
 *   3. Main Work (Chemical, Setting Out Materials, Security, PPE, Granite, Site Office)
 *   4. Excavation of Trenches
 *   5. Transportation of Tools
 *   6. Ach Shittu Materials
 *   7. Workmanship
 *   8. Other Expenses — catch-all for anything not covered above
 *
 * These group names are also what the exported workbook uses as its
 * sheet/tab names, so pick a category here and it lands in the matching
 * sheet automatically.
 */
const CATEGORY_GROUPS = {
  'Accommodation': ['Hotel Accommodation', 'House Rent', 'House Cleaning', 'House Setup Materials'],
  'Block Production': ['Store Construction', 'Cement', 'Burnt Bricks', 'Water Supply', 'Sharp Sand', 'Block Production'],
  'Main Work': ['Chemical', 'Setting Out Materials', 'Security', 'PPE & Safety Equipment', 'Granite', 'Site Office'],
  'Excavation of Trenches': ['Excavation of Trenches', 'Excavation Equipment Hire'],
  'Transportation of Tools': ['Transportation of Tools', 'Fuel for Transportation'],
  'Ach Shittu Materials': ['Ach Shittu Materials (Bulk Purchase)'],
  'Workmanship': ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Welder', 'Painter', 'General Labour', 'Workmanship (Other)'],
  'Other Expenses': [
    'Iron Rods', 'Timber', 'Roofing Materials', 'Paint', 'Tiles', 'Plumbing Materials',
    'Electrical Materials', 'Doors & Windows', 'Glass & Aluminium', 'Blocks', 'Bricks',
    'Generator Fuel', 'Diesel', 'Petrol', 'Internet & Communication',
    'Equipment Hire', 'Machinery Repair', 'Tool Purchase', 'Haulage', 'Loading & Offloading',
    'Site Cleaning', 'Office Supplies', 'Waste Disposal', 'Miscellaneous'
  ]
};

const CATEGORY_FLAT = Object.values(CATEGORY_GROUPS).flat();

// Reverse lookup: leaf category -> its group. Used by the Reports page
// group filter and by the Excel/PDF export to file each expense into
// the right sheet.
const CATEGORY_GROUP_OF = {};
Object.keys(CATEGORY_GROUPS).forEach(g => CATEGORY_GROUPS[g].forEach(c => { CATEGORY_GROUP_OF[c] = g; }));

const CATEGORY_GROUP_ORDER = Object.keys(CATEGORY_GROUPS);

function populateCategorySelect(selectEl, includeBlank) {
  let html = includeBlank ? '<option value="">All categories</option>' : '';
  Object.keys(CATEGORY_GROUPS).forEach(group => {
    html += `<optgroup label="${group}">`;
    CATEGORY_GROUPS[group].forEach(c => {
      html += `<option value="${c}">${c}</option>`;
    });
    html += `</optgroup>`;
  });
  selectEl.innerHTML = html;
}

/**
 * Keyword synonyms for auto-categorizing free-text expense descriptions
 * (used by the Excel import feature). Each key is a lowercase keyword to
 * look for inside a description; the value is the exact category it
 * should map to. Checked in array order, so more specific terms should
 * come before more general ones.
 */
const CATEGORY_KEYWORDS = [
  ['hotel', 'Hotel Accommodation'], ['lodge', 'Hotel Accommodation'],
  ['house rent', 'House Rent'], ['rent', 'House Rent'],
  ['house clean', 'House Cleaning'], ['cleaning', 'House Cleaning'],
  ['house setup', 'House Setup Materials'],
  ['store construction', 'Store Construction'],
  ['cement', 'Cement'],
  ['burnt brick', 'Burnt Bricks'], ['brick', 'Bricks'],
  ['water', 'Water Supply'],
  ['sharp sand', 'Sharp Sand'], ['sand', 'Sharp Sand'],
  ['chemical', 'Chemical'], ['herbicide', 'Chemical'], ['spray', 'Chemical'], ['weed', 'Chemical'],
  ['setting out', 'Setting Out Materials'],
  ['security', 'Security'], ['guard', 'Security'], ['watchman', 'Security'],
  ['ppe', 'PPE & Safety Equipment'], ['safety', 'PPE & Safety Equipment'], ['helmet', 'PPE & Safety Equipment'], ['boot', 'PPE & Safety Equipment'],
  ['granite', 'Granite'],
  ['site office', 'Site Office'],
  ['excavation', 'Excavation of Trenches'], ['trench', 'Excavation of Trenches'],
  ['transportation of tool', 'Transportation of Tools'], ['transport', 'Transportation of Tools'],
  ['fuel for transport', 'Fuel for Transportation'],
  ['ach shittu', 'Ach Shittu Materials (Bulk Purchase)'], ['shittu', 'Ach Shittu Materials (Bulk Purchase)'],
  ['mason', 'Mason'], ['carpenter', 'Carpenter'], ['electrician', 'Electrician'],
  ['plumber', 'Plumber'], ['welder', 'Welder'], ['painter', 'Painter'],
  ['labour', 'General Labour'], ['labor', 'General Labour'], ['wages', 'General Labour'], ['workmanship', 'Workmanship (Other)'],
  ['iron rod', 'Iron Rods'], ['rebar', 'Iron Rods'],
  ['timber', 'Timber'], ['wood', 'Timber'],
  ['roofing', 'Roofing Materials'], ['roof sheet', 'Roofing Materials'], ['zinc', 'Roofing Materials'],
  ['paint', 'Paint'],
  ['tile', 'Tiles'],
  ['plumbing', 'Plumbing Materials'], ['pipe', 'Plumbing Materials'],
  ['electrical', 'Electrical Materials'], ['wire', 'Electrical Materials'], ['cable', 'Electrical Materials'],
  ['door', 'Doors & Windows'], ['window', 'Doors & Windows'],
  ['glass', 'Glass & Aluminium'], ['aluminium', 'Glass & Aluminium'], ['aluminum', 'Glass & Aluminium'],
  ['block', 'Blocks'],
  ['generator', 'Generator Fuel'],
  ['diesel', 'Diesel'],
  ['petrol', 'Petrol'], ['fuel', 'Petrol'],
  ['internet', 'Internet & Communication'], ['airtime', 'Internet & Communication'], ['data', 'Internet & Communication'],
  ['equipment hire', 'Equipment Hire'], ['machine hire', 'Equipment Hire'],
  ['machinery repair', 'Machinery Repair'], ['repair', 'Machinery Repair'],
  ['tool purchase', 'Tool Purchase'], ['tool', 'Tool Purchase'],
  ['haulage', 'Haulage'],
  ['loading', 'Loading & Offloading'], ['offloading', 'Loading & Offloading'],
  ['site clean', 'Site Cleaning'],
  ['office supplies', 'Office Supplies'], ['stationery', 'Office Supplies'],
  ['waste', 'Waste Disposal'], ['disposal', 'Waste Disposal']
];

/**
 * Guess the best-matching category for a free-text description.
 * Returns { category, confidence } where confidence is 'exact',
 * 'keyword', or 'none' (falls back to 'Miscellaneous').
 */
function guessCategory(text) {
  if (!text) return { category: 'Miscellaneous', confidence: 'none' };
  const t = String(text).trim();
  const tLower = t.toLowerCase();

  // 1. Exact match against a real category name (case-insensitive).
  const exact = CATEGORY_FLAT.find(c => c.toLowerCase() === tLower);
  if (exact) return { category: exact, confidence: 'exact' };

  // 2. Keyword search within the text.
  for (const [keyword, category] of CATEGORY_KEYWORDS) {
    if (tLower.indexOf(keyword) !== -1) {
      return { category, confidence: 'keyword' };
    }
  }

  // 3. No match — flag it so the person reviews it manually.
  return { category: 'Miscellaneous', confidence: 'none' };
}
