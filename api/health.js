module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Direct health endpoint works!',
    time: new Date().toISOString()
  });
};
