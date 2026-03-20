const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.verifyStudent = (req, res, next) => {
  if (!JWT_SECRET) {
    console.error("SECURITY: JWT_SECRET env var not set!");
    return res.status(500).json({ error: "Server not configured correctly", code: "SERVER_ERROR" });
  }

  const authHeader = req.headers.authorization;
  console.log("verifyStudent: authHeader present:", !!authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("verifyStudent: decoded role:", decoded.role, "pin:", decoded.pin);

    if (decoded.role !== "student") {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.log("verifyStudent: jwt.verify failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token", code: "UNAUTHORIZED" });
  }
};