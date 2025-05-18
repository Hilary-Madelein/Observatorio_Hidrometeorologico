'use strict';

module.exports = (sequelize, DataTypes) => {
    const Account = sequelize.define('account', {
        external_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            unique: true
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        email: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING(150),
            allowNull: false
        }
    }, {
        freezeTableName: true,
        underscored: true,
        tableName: 'account',
        timestamps: true
    });

    Account.associate = function (models) {
        Account.belongsTo(models.entity, {
            foreignKey: {
                name: 'id_entity',
                allowNull: false
            }
        });
    };

    return Account;
};
