const jwt = require("jsonwebtoken");
const responseHelper = require("../helpers/http-responses");
async function validateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    responseHelper.unauthorized(res, "Unauthorized", null);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    responseHelper.unauthorized(res, "Invalid token", null);
  }
}

module.exports = validateToken;
