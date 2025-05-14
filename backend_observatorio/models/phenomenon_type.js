'use strict';

module.exports = (sequelize, DataTypes) => {
    const phenomenon_type = sequelize.define('phenomenon_type', {
        name: {
            type: DataTypes.STRING(20),
            unique: true,
            allowNull: false
        },
        icon: {
            type: DataTypes.STRING(80),
            defaultValue: "NO_DATA"
        },
        unit_measure: {
            type: DataTypes.STRING(4),
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
        operations: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: []
        }
    }, {
        freezeTableName: true,
        underscored: true
    });

    phenomenon_type.associate = function(models) {
        phenomenon_type.hasMany(models.daily_measurement, {
            foreignKey: 'id_phenomenon_type',
            as: 'daily_measurements'
        });
    };

    return phenomenon_type;
};
