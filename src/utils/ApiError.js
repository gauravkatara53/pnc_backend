class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.success = false; // Helpful for frontend
    this.errors = errors; // Detailed validation errors
    this.timestamp = new Date().toISOString();

    // Capture the stack trace
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Standardized JSON response
  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}

export default ApiError;
