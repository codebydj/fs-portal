const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.verifyAdmin = (req, res, next) => {
  if (!JWT_SECRET) {
    console.error("SECURITY: JWT_SECRET env var not set!");
    return res.status(500).json({ error: "Server not configured correctly", code: "SERVER_ERROR" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.log("verifyAdmin: jwt.verify failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token", code: "UNAUTHORIZED" });
  }
};