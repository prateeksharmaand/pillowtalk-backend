module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'pillowtalk_dev_secret_change_in_prod',
  JWT_EXPIRES_IN: '30d',
};
