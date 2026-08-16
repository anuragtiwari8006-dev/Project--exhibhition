const errorHandler = (err, req, res, next) => {
  console.error('Unhandled System Error:', err.stack);

  res.status(err.status || 500).render('error', {
    message: err.message || 'An unexpected error occurred on the server. Please try again later.'
  });
};

module.exports = errorHandler;