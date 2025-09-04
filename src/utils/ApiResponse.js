// utils/ApiResponse.js

class ApiResponse {
  constructor(statusCode, data, message = "success", errors = null) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }
}

export { ApiResponse };

// Optional: Quick helper
export const sendResponse = (
  res,
  statusCode,
  data,
  message = "success",
  errors = null
) => {
  const response = new ApiResponse(statusCode, data, message, errors);
  return res.status(statusCode).json(response);
};
