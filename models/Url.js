const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // adjust path based on your folder structure

const Url = sequelize.define('Url', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shortCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  timestamps: true
});

module.exports = Url;
