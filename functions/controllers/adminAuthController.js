const jwt = require("jsonwebtoken");

// All credentials loaded from environment variables only
// Set these via: firebase functions:config:set or .env file
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASS;

exports.adminLogin = async (req, res) => {
  try {
    // Guard: if env vars not set, refuse all logins
    if (!JWT_SECRET || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      console.error("SECURITY: JWT_SECRET / ADMIN_USER / ADMIN_PASS env vars not set!");
      return res.status(500).json({ error: "Server not configured correctly", code: "SERVER_ERROR" });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required", code: "INVALID_CREDENTIALS" });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid admin credentials", code: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { role: "admin", username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({ token, role: "admin", expires_in: 86400 });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};