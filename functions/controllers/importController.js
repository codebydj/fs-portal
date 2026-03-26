const admin = require("firebase-admin");
const db = admin.firestore();

function parseDob(raw) {
  if (!raw && raw !== 0) return null;
  const str = String(raw).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str.replace(/-/g, "/");
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }
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
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  } catch (_) {}
  return null;
}

async function processBuffer(buffer) {
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  if (!rows || rows.length < 2) throw new Error("File has no data rows");

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => cell && String(cell).trim() !== ""),
  );

  const headers = rows[headerRowIndex]?.map((h) =>
    String(h).trim().toLowerCase(),
  );

  if (!headers || headers.length === 0) {
    throw new Error("No valid header row found in file");
  }

  const pinIdx = headers.findIndex(
    (h) =>
      h.includes("pin") ||
      h.includes("regno") ||
      h.includes("roll") ||
      h.includes("id") ||
      h.includes("no"),
  );
  const dobIdx = headers.findIndex(
    (h) =>
      h.includes("dob") ||
      h.includes("date") ||
      h.includes("birth") ||
      h.includes("born"),
  );
  const nameIdx = headers.findIndex(
    (h) =>
      h.includes("name") || h.includes("student") || h.includes("candidate"),
  );

  if (pinIdx === -1)
    throw new Error(`PIN column not found. Headers: [${headers.join(", ")}]`);
  if (dobIdx === -1)
    throw new Error(`DOB column not found. Headers: [${headers.join(", ")}]`);

  const PIN_REGEX = /^\d{5}[A-Z]\d{2}[A-Z0-9]+$/;
  let importedCount = 0,
    skippedCount = 0;
  const errors = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  const pinOccurrences = {}; // Initialize for duplicate detection
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c).trim() === "")) continue;

    const rawPin = String(row[pinIdx] || "")
      .trim()
      .toUpperCase();
    const parsedDob = parseDob(row[dobIdx]);
    const studentName = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : "";

    if (!PIN_REGEX.test(rawPin)) {
      skippedCount++;
      if (errors.length < 20)
        errors.push(`Row ${i + 1}: Invalid PIN "${rawPin}"`);
      continue;
    }
    if (!parsedDob) {
      skippedCount++;
      if (errors.length < 20)
        errors.push(
          `Row ${i + 1}: Cannot parse DOB "${row[dobIdx]}" for PIN ${rawPin}`,
        );
      continue;
    }

    // Increment occurrence count for valid PINs
    pinOccurrences[rawPin] = (pinOccurrences[rawPin] || 0) + 1;

    currentBatch.set(
      db.collection("students").doc(rawPin),
      {
        pin: rawPin,
        dob: parsedDob,
        branch: rawPin.substring(5, 8),
        year: "20" + rawPin.substring(0, 2),
        name: studentName,
        has_submitted: false,
      },
      { merge: true },
    );

    importedCount++;
    batchCount++;
    if (batchCount >= 499) {
      await currentBatch.commit();
      currentBatch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await currentBatch.commit();

  // Calculate duplicate count from the collected occurrences of *valid* PINs
  const duplicateCount = Object.values(pinOccurrences).filter(
    (c) => c > 1,
  ).length;
  return { importedCount, skippedCount, errors, duplicateCount };
}

exports.importStudents = (req, res) => {
  console.log("=== importStudents ===");
  console.log("content-type:", req.headers["content-type"]);

  if (req.file) {
    console.log("Using req.file, size:", req.file.size);
    processBuffer(req.file.buffer)
      .then(({ importedCount, skippedCount, errors, duplicateCount }) => {
        res.status(200).json({
          success: true,
          importedCount,
          skippedCount,
          errors,
          duplicateCount,
          message: `Successfully imported ${importedCount} students. Skipped ${skippedCount}.`,
        });
      })
      .catch((err) => {
        console.error("Process error:", err.message);
        res.status(500).json({ error: err.message, code: "SERVER_ERROR" });
      });
    return;
  }

  const Busboy = require("busboy");
  const chunks = [];

  try {
    const busboy = Busboy({ headers: req.headers });

    busboy.on("file", (fieldname, file, info) => {
      console.log("File field received:", fieldname, info.filename);
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => console.log("File end, chunks:", chunks.length));
    });

    busboy.on("finish", async () => {
      console.log(
        "Busboy finish, total bytes:",
        chunks.reduce((a, c) => a + c.length, 0),
      );

      if (chunks.length === 0) {
        return res.status(400).json({
          error: "No file data received. Please select an Excel file.",
          code: "INVALID_REQUEST",
        });
      }

      try {
        const buffer = Buffer.concat(chunks);
        const result = await processBuffer(buffer);
        return res.status(200).json({
          success: true,
          ...result,
          message: `Successfully imported ${result.importedCount} students. Skipped ${result.skippedCount}.`,
        });
      } catch (err) {
        console.error("Process error:", err.message);
        return res
          .status(500)
          .json({ error: err.message, code: "SERVER_ERROR" });
      }
    });

    busboy.on("error", (err) => {
      console.error("Busboy error:", err.message);
      return res.status(500).json({
        error: "File parse error: " + err.message,
        code: "SERVER_ERROR",
      });
    });

    req.pipe(busboy);
  } catch (err) {
    console.error("importStudents error:", err.message);
    return res
      .status(500)
      .json({ error: "Server error: " + err.message, code: "SERVER_ERROR" });
  }
};
