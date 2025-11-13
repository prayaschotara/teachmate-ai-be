function sendResponse(res, statusCode, success, msg, data) {
  res.status(statusCode).json({
    success,
    msg,
    data,
  });
}

const responseHelper = {
  success: (res, message = "Success", data = null) =>
    sendResponse(res, 200, true, message, data),

  created: (res, message = "Resource created", data = null) =>
    sendResponse(res, 201, true, message, data),

  badRequest: (res, message = "Bad request", data = null) =>
    sendResponse(res, 400, false, message, data),

  unauthorized: (res, message = "Unauthorized", data = null) =>
    sendResponse(res, 401, false, message, data),

  forbidden: (res, message = "Forbidden", data = null) =>
    sendResponse(res, 403, false, message, data),

  notFound: (res, message = "Not found", data = null) =>
    sendResponse(res, 404, false, message, data),

  serverError: (res, message = "Internal server error", data = null) =>
    sendResponse(res, 500, false, message, data),
};

module.exports = responseHelper;
