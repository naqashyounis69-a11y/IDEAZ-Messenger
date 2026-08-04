exports.validateRegister = (body) => {
  const errors = [];

  if (!body.name || body.name.trim().length < 2) errors.push("Name must be at least 2 characters");
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push("Valid email is required");
  if (!body.password || body.password.length < 6) errors.push("Password must be at least 6 characters");

  return { isValid: errors.length === 0, errors };
};

exports.validateLogin = (body) => {
  const errors = [];

  if (!body.email) errors.push("Email is required");
  if (!body.password) errors.push("Password is required");

  return { isValid: errors.length === 0, errors };
};
