const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Usage = sequelize.define('Usage', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: false,
});

module.exports = Usage;
