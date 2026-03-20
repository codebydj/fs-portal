const admin = require("firebase-admin");
const db = admin.firestore();

function parseDob(raw) {
  if (raw === null || raw === undefined || raw === "") return null;

  // Case 1: Already a JS Date object (XLSX parsed it automatically)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    // Use UTC to avoid timezone shift
    const d = String(raw.getUTCDate()).padStart(2, "0");
    const m = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const y = raw.getUTCFullYear();
    if (y < 1950 || y > 2100) return null;
    return `${d}/${m}/${y}`;
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Case 2: Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  // Case 3: DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str.replace(/-/g, "/");

  // Case 4: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }

  // Case 5: Excel serial number (e.g. 37622)
  if (/^\d+(\.\d+)?$/.test(str)) {
    const serial = Math.floor(Number(str));
    if (serial > 0 && serial < 100000) {
      try {
        const jsDate = new Date(Date.UTC(1900, 0, 1) + (serial - 2) * 86400000);
        const d = String(jsDate.getUTCDate()).padStart(2, "0");
        const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
        const y = jsDate.getUTCFullYear();
        if (y > 1950 && y < 2100) return `${d}/${m}/${y}`;
      } catch (_) {}
    }
  }

  // Case 6: "15-Aug-2003" or "15 Aug 2003" or "Aug 15, 2003" or any locale string
  // Parse via Date but force UTC interpretation to avoid timezone shifts
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      // Use UTC values to prevent off-by-one from IST offset
      const d = String(parsed.getUTCDate()).padStart(2, "0");
      const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const y = parsed.getUTCFullYear();
      if (y > 1950 && y < 2100) return `${d}/${m}/${y}`;
    }
  } catch (_) {}

  return null;
}

function extractFileFromRawBody(rawBody, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
  if (!boundaryMatch) throw new Error("No boundary found in content-type: " + contentType);

  const boundary = boundaryMatch[1].replace(/^"(.*)"$/, "$1");
  const bodyStr = rawBody.toString("binary");
  const delimBoundary = "--" + boundary;
  const parts = bodyStr.split(delimBoundary);

  for (const part of parts) {
    if (!part.includes("Content-Disposition")) continue;
    if (!part.includes('name="file"') && !part.includes("filename=")) continue;

    const headerBodySplit = part.indexOf("\r\n\r\n");
    if (headerBodySplit === -1) continue;

    let fileContent = part.substring(headerBodySplit + 4);
    fileContent = fileContent.replace(/\r\n$/, "");
    return Buffer.from(fileContent, "binary");
  }

  throw new Error("No file found in multipart body");
}

exports.importStudents = async (req, res) => {
  console.log("=== importStudents via rawBody ===");
  console.log("content-type:", req.headers["content-type"]);
  console.log("rawBody exists:", !!req.rawBody, "size:", req.rawBody ? req.rawBody.length : 0);

  try {
    if (!req.rawBody || req.rawBody.length === 0) {
      return res.status(400).json({ error: "No file data received", code: "INVALID_REQUEST" });
    }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Expected multipart/form-data, got: " + contentType, code: "INVALID_REQUEST" });
    }

    let fileBuffer;
    try {
      fileBuffer = extractFileFromRawBody(req.rawBody, contentType);
      console.log("Extracted file buffer size:", fileBuffer.length);
    } catch (e) {
      console.error("Failed to extract file:", e.message);
      return res.status(400).json({ error: "Could not extract file: " + e.message, code: "INVALID_REQUEST" });
    }

    const XLSX = require("xlsx");

    // Use cellDates:true so XLSX gives us JS Date objects directly — most reliable
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true, raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

    console.log("Rows found:", rows.length);
    console.log("Header row:", JSON.stringify(rows[0]));
    if (rows[1]) console.log("Row 1 sample:", JSON.stringify(rows[1]));
    if (rows[2]) console.log("Row 2 sample:", JSON.stringify(rows[2]));

    if (!rows || rows.length < 2) {
      return res.status(400).json({ error: "File has no data rows", code: "INVALID_REQUEST" });
    }

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const pinIdx = headers.findIndex((h) =>
      h.includes("pin") || h.includes("reg") || h.includes("roll") || h.includes("id") || h.includes("no")
    );
    const dobIdx = headers.findIndex((h) =>
      h.includes("dob") || h.includes("date") || h.includes("birth") || h.includes("born")
    );
    // Name column — optional, won't fail if missing
    const nameIdx = headers.findIndex((h) =>
      h.includes("name") || h.includes("student") || h.includes("candidate")
    );

    console.log("Headers:", headers, "pinIdx:", pinIdx, "dobIdx:", dobIdx, "nameIdx:", nameIdx);

    if (pinIdx === -1) {
      return res.status(400).json({
        error: `PIN column not found. Detected headers: [${headers.join(", ")}]`,
        code: "INVALID_REQUEST",
      });
    }
    if (dobIdx === -1) {
      return res.status(400).json({
        error: `DOB column not found. Detected headers: [${headers.join(", ")}]`,
        code: "INVALID_REQUEST",
      });
    }

    const PIN_REGEX = /^\d{5}[A-Z]\d{2}[A-Z0-9]+$/;
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];
    let currentBatch = db.batch();
    let batchCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => String(c).trim() === "")) continue;

      const rawPin = String(row[pinIdx] || "").trim().toUpperCase();
      const rawDob = row[dobIdx];
      const parsedDob = parseDob(rawDob);
      const studentName = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : "";

      console.log(`Row ${i + 1}: PIN="${rawPin}" rawDob=${JSON.stringify(rawDob)} parsedDob=${parsedDob} name="${studentName}"`);

      if (!PIN_REGEX.test(rawPin)) {
        skippedCount++;
        if (errors.length < 20) errors.push(`Row ${i + 1}: Invalid PIN "${rawPin}"`);
        continue;
      }
      if (!parsedDob) {
        skippedCount++;
        if (errors.length < 20) errors.push(`Row ${i + 1}: Cannot parse DOB "${rawDob}" for PIN ${rawPin}`);
        continue;
      }

      currentBatch.set(db.collection("students").doc(rawPin), {
        pin: rawPin,
        dob: parsedDob,
        branch: rawPin.substring(5, 8),
        year: "20" + rawPin.substring(0, 2),
        name: studentName,
        has_submitted: false,
      }, { merge: true });

      importedCount++;
      batchCount++;

      if (batchCount >= 499) {
        await currentBatch.commit();
        currentBatch = db.batch();
        batchCount = 0;
        console.log("Batch committed, total:", importedCount);
      }
    }

    if (batchCount > 0) await currentBatch.commit();

    console.log(`Import done: ${importedCount} imported, ${skippedCount} skipped`);

    return res.status(200).json({
      success: true,
      importedCount,
      skippedCount,
      errors,
      message: `Successfully imported ${importedCount} students. Skipped ${skippedCount}.`,
    });

  } catch (err) {
    console.error("importStudents error:", err.message, err.stack);
    return res.status(500).json({ error: "Import failed: " + err.message, code: "SERVER_ERROR" });
  }
};