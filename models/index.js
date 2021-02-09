const Sequelize = require('sequelize');
const env = process.env.NODE_ENV;
const config = require(__dirname + '/../config/sequelizeConfig.js')[env];


const db = {};
const dbPool = { // default size
  max: 5,
  min: 0,
  acquire: 30000,
  idle:10000
};

const sequelize = new Sequelize(config.database, config.username, config.password, config, {pool: dbPool});

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.Plogging = require('./userModel')(sequelize,Sequelize);
module.exports = db;
