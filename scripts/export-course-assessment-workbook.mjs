import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "/Users/rahul/Coding/PEPMarketing/pep-training-app";
const outputDir = path.join(root, "outputs/course_assessment_export");
const outputPath = path.join(outputDir, "course-mcqs-and-voice-assessments.xlsx");

function parseEnv(text) {
  const env = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const env = parseEnv(await fs.readFile(path.join(root, ".env.local"), "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase URL or service role key in .env.local");

async function rest(table, params = "") {
  const url = `${supabaseUrl}/rest/v1/${table}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) throw new Error(`${table} request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchAll(table, params) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const joiner = params ? "&" : "";
    const rows = await rest(table, `${params}${joiner}limit=1000&offset=${offset}`);
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

function letter(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function rangeAddress(rowCount, colCount) {
  return `A1:${letter(colCount - 1)}${rowCount}`;
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

function correctLetter(index) {
  return ["A", "B", "C", "D"][Number(index)] || "";
}

const [programs, sections, exercises, assessmentQuestions] = await Promise.all([
  fetchAll("programs", "select=id,slug,title,is_active&order=slug.asc"),
  fetchAll("program_sections", "select=id,program_id,slug,title,sort_order&order=program_id.asc,sort_order.asc"),
  fetchAll("program_exercises", "select=id,section_id,sort_order,exercise_type,question,options,correct_index,explanation,scenario,guidance,ai_prompt&order=section_id.asc,sort_order.asc"),
  fetchAll("program_assessment_questions", "select=id,program_id,sort_order,module_label,question,options,correct_index,explanation&order=program_id.asc,sort_order.asc"),
]);

const programById = new Map(programs.map((p) => [p.id, p]));
const sectionsById = new Map(sections.map((s) => [s.id, s]));

const mcqHeaders = [
  "Course Slug",
  "Course Title",
  "Course Active",
  "Source",
  "Section Order",
  "Section Slug",
  "Section Title",
  "Item Order",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Option",
  "Correct Answer",
  "Explanation",
  "Record ID",
];

const mcqRows = [];
for (const ex of exercises) {
  if (ex.exercise_type !== "multiple_choice") continue;
  const section = sectionsById.get(ex.section_id);
  const program = section ? programById.get(section.program_id) : undefined;
  const options = Array.isArray(ex.options) ? ex.options : [];
  mcqRows.push([
    clean(program?.slug),
    clean(program?.title),
    program?.is_active === false ? "No" : "Yes",
    "Section Exercise",
    Number(section?.sort_order ?? 0) + 1,
    clean(section?.slug),
    clean(section?.title),
    Number(ex.sort_order ?? 0) + 1,
    clean(ex.question),
    clean(options[0]),
    clean(options[1]),
    clean(options[2]),
    clean(options[3]),
    correctLetter(ex.correct_index),
    clean(options[Number(ex.correct_index)]),
    clean(ex.explanation),
    clean(ex.id),
  ]);
}

for (const q of assessmentQuestions) {
  const program = programById.get(q.program_id);
  const options = Array.isArray(q.options) ? q.options : [];
  mcqRows.push([
    clean(program?.slug),
    clean(program?.title),
    program?.is_active === false ? "No" : "Yes",
    "Final Assessment",
    "",
    "",
    clean(q.module_label),
    Number(q.sort_order ?? 0) + 1,
    clean(q.question),
    clean(options[0]),
    clean(options[1]),
    clean(options[2]),
    clean(options[3]),
    correctLetter(q.correct_index),
    clean(options[Number(q.correct_index)]),
    clean(q.explanation),
    clean(q.id),
  ]);
}

mcqRows.sort((a, b) =>
  String(a[0]).localeCompare(String(b[0])) ||
  String(a[3]).localeCompare(String(b[3])) ||
  Number(a[4] || 9999) - Number(b[4] || 9999) ||
  Number(a[7] || 0) - Number(b[7] || 0)
);

const voiceHeaders = [
  "Course Slug",
  "Course Title",
  "Course Active",
  "Section Order",
  "Section Slug",
  "Section Title",
  "Item Order",
  "Voice Assessment Title",
  "Scenario",
  "Guidance",
  "AI Rubric",
  "Record ID",
];

const voiceRows = exercises
  .filter((ex) => ex.exercise_type === "voice")
  .map((ex) => {
    const section = sectionsById.get(ex.section_id);
    const program = section ? programById.get(section.program_id) : undefined;
    return [
      clean(program?.slug),
      clean(program?.title),
      program?.is_active === false ? "No" : "Yes",
      Number(section?.sort_order ?? 0) + 1,
      clean(section?.slug),
      clean(section?.title),
      Number(ex.sort_order ?? 0) + 1,
      clean(ex.question),
      clean(ex.scenario),
      clean(ex.guidance),
      clean(ex.ai_prompt),
      clean(ex.id),
    ];
  })
  .sort((a, b) =>
    String(a[0]).localeCompare(String(b[0])) ||
    Number(a[3] || 0) - Number(b[3] || 0) ||
    Number(a[6] || 0) - Number(b[6] || 0)
  );

const programCounts = programs
  .map((program) => {
    const programSections = sections.filter((s) => s.program_id === program.id);
    const sectionIds = new Set(programSections.map((s) => s.id));
    const practiceMcqs = exercises.filter((e) => e.exercise_type === "multiple_choice" && sectionIds.has(e.section_id)).length;
    const voices = exercises.filter((e) => e.exercise_type === "voice" && sectionIds.has(e.section_id)).length;
    const finalMcqs = assessmentQuestions.filter((q) => q.program_id === program.id).length;
    return [
      clean(program.slug),
      clean(program.title),
      program.is_active === false ? "No" : "Yes",
      programSections.length,
      practiceMcqs,
      finalMcqs,
      practiceMcqs + finalMcqs,
      voices,
    ];
  })
  .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
const mcqSheet = workbook.worksheets.add("MCQs");
const voiceSheet = workbook.worksheets.add("Voice Assessments");

function writeSheet(sheet, rows, tableName, widths) {
  const rowCount = rows.length;
  const colCount = rows[0].length;
  sheet.getRangeByIndexes(0, 0, rowCount, colCount).values = rows;
  const used = sheet.getRangeByIndexes(0, 0, rowCount, colCount);
  used.format = { wrapText: true, verticalAlignment: "top" };
  sheet.getRangeByIndexes(0, 0, 1, colCount).format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    verticalAlignment: "top",
  };
  sheet.tables.add(rangeAddress(rowCount, colCount), true, tableName);
  sheet.freezePanes.freezeRows(1);
  for (let c = 0; c < widths.length; c += 1) {
    sheet.getRangeByIndexes(0, c, rowCount, 1).format.columnWidthPx = widths[c];
  }
  sheet.getRangeByIndexes(0, 0, rowCount, colCount).format.rowHeightPx = 72;
  sheet.getRangeByIndexes(0, 0, 1, colCount).format.rowHeightPx = 32;
}

summary.getRange("A1").values = [["Course Assessment Export"]];
summary.getRange("A1:H1").merge();
summary.getRange("A1:H1").format = {
  fill: "#174A7C",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
summary.getRange("A3:B6").values = [
  ["Generated From", "Live local Supabase database"],
  ["Programs", programs.length],
  ["MCQ Rows", mcqRows.length],
  ["Voice Assessment Rows", voiceRows.length],
];
summary.getRange("A8:H8").values = [[
  "Course Slug",
  "Course Title",
  "Course Active",
  "Sections",
  "Section MCQs",
  "Final Assessment MCQs",
  "Total MCQs",
  "Voice Assessments",
]];
summary.getRangeByIndexes(8, 0, programCounts.length, 8).values = programCounts;
summary.getRange(`A8:H${8 + programCounts.length}`).format = { wrapText: true, verticalAlignment: "top" };
summary.getRange("A8:H8").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
};
summary.tables.add(`A8:H${8 + programCounts.length}`, true, "SummaryByCourse");
summary.freezePanes.freezeRows(8);
[140, 330, 90, 80, 100, 140, 100, 130].forEach((w, i) => {
  summary.getRangeByIndexes(0, i, 8 + programCounts.length, 1).format.columnWidthPx = w;
});

writeSheet(
  mcqSheet,
  [mcqHeaders, ...mcqRows],
  "AllMCQs",
  [150, 300, 90, 130, 90, 170, 260, 80, 420, 300, 300, 300, 300, 95, 320, 420, 280]
);

writeSheet(
  voiceSheet,
  [voiceHeaders, ...voiceRows],
  "VoiceAssessments",
  [150, 300, 90, 90, 170, 260, 80, 260, 430, 430, 520, 280]
);

const inspections = [];
inspections.push(await workbook.inspect({ kind: "table", range: "Summary!A1:H20", tableMaxRows: 20, tableMaxCols: 8, maxChars: 3000 }));
inspections.push(await workbook.inspect({ kind: "table", range: "MCQs!A1:Q6", tableMaxRows: 6, tableMaxCols: 17, maxChars: 5000 }));
inspections.push(await workbook.inspect({ kind: "table", range: "Voice Assessments!A1:L6", tableMaxRows: 6, tableMaxCols: 12, maxChars: 5000 }));
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  programs: programs.length,
  mcqRows: mcqRows.length,
  voiceRows: voiceRows.length,
  formulaErrorScan: errors.ndjson,
}, null, 2));
