const errorHandler = (err, req, res, next) => {
  console.error('SERVER_ERROR:', err.stack || err.message || err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
