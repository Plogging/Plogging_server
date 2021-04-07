const {sequelize} = require('./index');
const { Op } = require('sequelize')
const User = sequelize.models.user;
const UserSchema = {};

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
    appleIdentifier = null,
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
        salt: salt,
        appleIdentifier: appleIdentifier,
        }, {transaction: t});
    };

UserSchema.updateUserName = async(userId, userName) => await User.update({
    display_name: userName
}, {where: {user_id: userId}});

UserSchema.updateUserImg = async(userId, profileImg) => await User.update({
    profile_img: profileImg
}, {where: {user_id: userId}});

UserSchema.changeUserPassword = async(
    userId, 
    newDigest,
    salt) =>
        await User.update({
            digest: newDigest,
            salt: salt
        }, {where: {user_id: userId}}
    );

UserSchema.deleteUser = async(userId, t = null) => await User.destroy({
    where: {user_id: userId}
}, {transaction: t});

UserSchema.findAppleUser = async(appleIdentifier) => await User.findOne({
    where: {appleIdentifier: appleIdentifier}
})

module.exports = UserSchema;