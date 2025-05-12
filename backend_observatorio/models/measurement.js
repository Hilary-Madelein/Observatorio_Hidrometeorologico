'use strict';

module.exports = (sequelize, DataTypes) => {
    const Measurement = sequelize.define('measurement', {
        local_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        external_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        underscored: true
    });

    Measurement.associate = function(models) {
        Measurement.belongsTo(models.station, {
            foreignKey: 'id_station',
            as: 'station'
        });
        Measurement.belongsTo(models.quantity, {
            foreignKey: 'id_quantity',
            as: 'quantity'
        });
        Measurement.belongsTo(models.phenomenon_operation, {
            foreignKey: 'id_phenomenon_operation',
            as: 'phenomenon_operation'
        });
    };

    return Measurement;
};
