module.exports = ((sequelize,DataTypes)=>{
    return sequelize.define('user',{
        id:{
            type: DataTypes.BIGINT,
            autoIncrement: true,
            unique: true,
            primaryKey: true
        },
        user_id:{
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        display_name:{
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        profile_img :{
            type: DataTypes.STRING,
            allowNull: false,
        },
        type:{
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        email:{
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        digest:{
            type: DataTypes.STRING
        },
        salt:{
            type: DataTypes.STRING
        }
    },{
        timestamps: true,
        // paranoid : true,
        indexes: [{ unique: true, fields: ['id', 'user_id', 'display_name'] }]
    })
})