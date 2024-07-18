const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const Usage = sequelize.define('Usage', {
  userId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
}, {
  tableName: 'usages',
  timestamps: false,
});

module.exports = Usage;
