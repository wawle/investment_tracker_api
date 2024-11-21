class ErrorResponse extends Error {
  statusCode: number;

  // constructor tipi belirtildi
  constructor(message: string, statusCode: number) {
    super(message); // Error constructor'ını çağırıyoruz
    this.statusCode = statusCode;

    // Error.captureStackTrace yalnızca V8 motorunda çalışır, bu yüzden Node.js ile uyumludur
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorResponse;
