const Sequelize = require('sequelize');

module.exports = ((sequelize,DataTypes)=>{
    return sequelize.define('user',{
        id:{
            type: DataTypes.INTEGER,
            autoIncrement: true,
            unique: true,
            primaryKey: true
        },
        user_id:{
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        display_name:{
            type: DataTypes.STRING(50)
        },
        profile_img :{
            type: DataTypes.STRING
        },
        type:{
            type: DataTypes.STRING(50)
        },
        email:{
            type: DataTypes.STRING(50)
        },
        secret_key:{
            type: DataTypes.STRING
        },
        score:{
            type: Sequelize.STRING(30),
            defaultValue: 0
        },
        distance:{
            type: Sequelize.STRING(30),
            defaultValue: 0
        },
        trash:{
            type: Sequelize.STRING(30),
            defaultValue: 0
        }
    },{
        timestamps: true,
        // paranoid : true,
        indexes: [{ unique: true, fields: ['id', 'user_id', 'display_name'] }]
    })
})