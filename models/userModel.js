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
        digest:{
            type: DataTypes.STRING
        },
        salt:{
            type: DataTypes.STRING
        },
        score_month:{
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        distance_month:{
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        trash_month:{
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        score_week:{
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        distance_week:{
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        trash_week:{
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        last_signin:{
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        active_account:{
            type: DataTypes.BOOLEAN,
            defaultValue: 1
        },
    },{
        timestamps: true,
        // paranoid : true,
        indexes: [{ unique: true, fields: ['id', 'user_id', 'display_name'] }]
    })
})