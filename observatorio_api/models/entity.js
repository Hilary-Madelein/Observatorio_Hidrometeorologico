'use strict';

module.exports = (sequelize, DataTypes) => {
    const Entity = sequelize.define('entity', {
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
            type: DataTypes.STRING(20),
            defaultValue: "NO_DATA"
        },
        lastname: {
            type: DataTypes.STRING(20),
            defaultValue: "NO_DATA"
        },
        phone: {
            type: DataTypes.STRING(20),
            defaultValue: "NO_DATA"
        },
        role: {
            type: DataTypes.ENUM('ADMINISTRADOR', 'USUARIO_GENERAL'),
            allowNull: false,
            defaultValue: 'ADMINISTRADOR'
        }
    }, {
        freezeTableName: true,
        underscored: true
    });

    Entity.associate = function (models) {
        Entity.hasOne(models.account, {
            foreignKey: 'id_entity',
            as: 'account'
        });
    };

    return Entity;
};
