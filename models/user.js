const {sequelize} = require('./index');
const { Op, fn, literal } = require('sequelize')
const User = sequelize.models.user;
const UserSchema = {};
const now = new Date();

UserSchema.findOneUser = async(userId, secretKey = null, t = null) => 
    secretKey?
        await User.findOne({
            where: {
                user_id: userId,
                digest: secretKey
            }
        }, {transaction: t}):
        await User.findOne({
            where: {
                user_id: userId
            }
        }, {transaction: t});

UserSchema.findUsers = async(userIds, t = null) => await User.findAll({
    where: {user_id: {[Op.in]: userIds}}
}, {transaction: t});

UserSchema.createUser = async(
    userId,
    userName,
    userImg,
    secretKey = null,
    salt = null,
    t = null) => {
    const [userEmail, userType] = userId.split(':');
    return await User.create({
        user_id: userId,
        display_name: userName,
        profile_img: userImg,
        type: userType,
        email: userEmail,
        digest: secretKey,
        salt: salt
        }, {transaction: t});
    };

UserSchema.updateUserName = async(userId, userName) => await User.update({
    display_name: userName
}, { where: { user_id: userId}});

UserSchema.updateUserImg = async(userId, profileImg) => await User.update({
    profile_img: profileImg
}, { where: { user_id: userId}});

UserSchema.changeUserPassword = async(
    userId, 
    newDigest,
    salt,
    existedDigest = null) =>  
        existedDigest? 
        await User.update({
            digest: newDigest,
            salt: salt
        }, { where: {
                user_id: userId,
                digest: existedDigest
            }}): 
        await User.update({
            digest: newDigest,
            salt: salt
        }, { where: {
                user_id: userId
            }}
    );

UserSchema.deleteUser = async(userId, t = null) => await User.destroy({
    where: {user_id: userId}
}, { transaction: t});

UserSchema.updateUserPloggingData = async(updatedPloggingData, userId, t = null) => await User.update({ 
        score_week: Number(updatedPloggingData.scoreWeek),
        distance_week: Number(updatedPloggingData.distanceWeek),
        trash_week: Number(updatedPloggingData.trashWeek),
        score_month: Number(updatedPloggingData.scoreMonth),
        distance_month: Number(updatedPloggingData.distanceMonth),
        trash_month: Number(updatedPloggingData.trashMonth)
    },{ where: { user_id: userId } 
    },{ transaction: t });

UserSchema.updateSignInDate = async(userId, t = null) => await User.update({
    last_signin: now
},{ where: { user_id: userId }
},{ transaction: t });

UserSchema.updateInactiveUser = async(t = null) => await User.update({
    active_account: 0
},{ where: {last_signin: {
        [Op.lt]: fn(
            'DATE_SUB',
            literal('NOW()'),
            literal('INTERVAL 1 YEAR')
        )}
}},{ transaction: t });

UserSchema.findInactiveUser = async(t = null) => await User.findAll({ 
    where: {
        last_signin: {
            [Op.lt]: 
                fn(
                    'DATE_SUB',
                    literal('NOW()'), 
                    literal('INTERVAL 335 DAY')
                ),
            [Op.gte]:
                fn(
                    'DATE_SUB',
                    literal('NOW()'), 
                    literal('INTERVAL 336 DAY')
                )
        },
        active_account: 1
    }
},{ transaction: t });

module.exports = UserSchema;