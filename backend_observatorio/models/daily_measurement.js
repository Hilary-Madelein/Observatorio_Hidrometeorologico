'use strict';

module.exports = (sequelize, DataTypes) => {
    const daily_measurement = sequelize.define('daily_measurement', {
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
        },
        quantity: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        underscored: true
    });

    daily_measurement.associate = function(models) {
        daily_measurement.belongsTo(models.phenomenon_type, {
            foreignKey: 'id_phenomenon_type',
            as: 'phenomenon_type'
        });
        daily_measurement.belongsTo(models.type_operation, {
            foreignKey: 'id_type_operation',
            as: 'type_operation'
        });
        daily_measurement.belongsTo(models.station, {
            foreignKey: 'id_station',
            as: 'station'
        });
    };

    return daily_measurement;
};
