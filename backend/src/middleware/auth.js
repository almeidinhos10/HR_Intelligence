import jwt from "jsonwebtoken";

function getTokenFromHeader(header = "") {
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req.headers.authorization);
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission." });
    }
    return next();
  };
}

