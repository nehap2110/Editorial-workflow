const VALID_ROLES = ["editor", "writer"];


const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  
  // `role` is optional (defaults to "writer" in the controller), but if it
  // is present it must be exactly "writer" or "editor". Checking against
  // `undefined` (instead of truthiness) means values like "", null, 0 or
  // false are rejected rather than silently falling back to the default.
  if (req.body.role !== undefined && !VALID_ROLES.includes(req.body.role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role",
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};