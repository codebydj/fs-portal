// Temporary test controller to diagnose file upload issues
exports.testUpload = async (req, res) => {
  console.log("=== TEST UPLOAD HIT ===");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("req.file:", req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  } : "UNDEFINED - multer did not parse file");
  console.log("req.body:", req.body);

  if (!req.file) {
    return res.status(400).json({
      error: "req.file is undefined — multer did not receive the file",
      headers: req.headers,
      body: req.body,
    });
  }

  return res.status(200).json({
    success: true,
    file: {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
};