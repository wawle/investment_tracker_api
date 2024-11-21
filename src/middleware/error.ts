import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/errorResponse';

// Hata işleyici middleware fonksiyonu
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  let error = { ...err };

  error.message = err.message;

  // Geliştirici için konsola log
  console.log(err);

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key hatası (11000 hata kodu)
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Hata mesajını ve durumu döndür
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

export default errorHandler;
