'use strict';

module.exports = (sequelize, DataTypes) => {
    const Station = sequelize.define('station', {
        external_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        status: {
            type: DataTypes.ENUM('OPERATIVA', 'MANTENIMIENTO', 'NO_OPERATIVA'),
            allowNull: false,
            defaultValue: 'OPERATIVA'
        },
        picture: {
            type: DataTypes.STRING(80),
            defaultValue: "NO_DATA"
        },
        name: {
            type: DataTypes.STRING(20),
            defaultValue: "NO_DATA"
        },
        longitude: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        latitude: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        altitude: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        id_device: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            defaultValue: "NO_DATA"
        },
        type: {
            type: DataTypes.ENUM('METEOROLOGICA', 'HIDROLOGICA', 'PLUVIOMETRICA'),
            allowNull: false,
            defaultValue: 'METEOROLOGICA'
        },
        description: {
            type: DataTypes.STRING(350),
            defaultValue: "NO_DATA"
        }
    }, {
        freezeTableName: true,
        underscored: true
    });

    Station.associate = function(models) {
        Station.belongsTo(models.microbasin, {
            foreignKey: 'id_microbasin',
            as: 'microbasin'
        });

        Station.hasMany(models.measurement, {
            foreignKey: 'id_station',
            as: 'measurements'
        });

        Station.hasMany(models.daily_measurement, {
            foreignKey: 'id_station',
            as: 'daily_measurements'
        });
    };

    return Station;
};
