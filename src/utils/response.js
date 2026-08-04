exports.sendSuccess = (res, statusCode = 200, data = null, message = "Success") => {
  return res.status(statusCode).json({ success: true, message, data });
};

exports.sendError = (res, statusCode = 400, message = "Error", errors = null) => {
  return res.status(statusCode).json({ success: false, message, errors });
};
