const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DonationProduct = sequelize.define('DonationProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  templeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'temples',
      key: 'id'
    }
  }
}, {
  tableName: 'donation_products',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['label', 'templeId'],
      name: 'unique_label_per_temple'
    }
  ]
});

module.exports = DonationProduct;
