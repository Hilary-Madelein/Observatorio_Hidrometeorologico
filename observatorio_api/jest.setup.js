const path = require('path');

const { sequelize } = require('./models');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
