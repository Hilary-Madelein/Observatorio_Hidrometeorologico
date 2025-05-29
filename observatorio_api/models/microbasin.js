'use strict';

module.exports = (sequelize, DataTypes) => {
    const Microbasin = sequelize.define('microbasin', {
        external_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        picture: {
            type: DataTypes.STRING(80),
            defaultValue: "NO_DATA"
        },
        name: {
            type: DataTypes.STRING(30),
            defaultValue: "NO_DATA"
        },
        description: {
            type: DataTypes.STRING(350),
            defaultValue: "NO_DATA"
        }
    }, {
        freezeTableName: true,
        underscored: true
    });

    Microbasin.associate = function(models) {
        Microbasin.hasMany(models.station, {
            foreignKey: 'id_microbasin',
            as: 'station'
        });
    };

    return Microbasin;
};
