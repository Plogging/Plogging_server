const {sequelize} = require('../models/index');
const User = sequelize.models.user;


const findOneUser = async(userId, t = null) => await User.findOne({ 
    where: {user_id: userId}
}, {transaction: t});

const createUser = async(
    userId,
    userName,
    userImg,
    secretKey = null,
    t = null) => {
    const [userEmail, userType] = userId.split(':');
    return await User.create({
        user_id: userId,
        display_name: userName,
        profile_img: userImg,
        type: userType,
        email: userEmail,
        secret_key: secretKey
        }, {transaction: t});
    };

const updateUserName = async(userId, userName) => await User.update({
    display_name: userName
}, { where: { user_id: userId}});

const updateUserImg = async(userId, profileImg) => await User.update({
    profile_img: profileImg
}, { where: { user_id: userId}});

const changeUserPassword = async(
    userId, 
    newSecretKey, 
    existedSecretKey= null) =>  
        existedSecretKey? await User.update({
            secret_key: newSecretKey
        }, { where: {
            user_id: userId,
            secret_key: existedSecretKey
            }}): await User.update({
            secret_key: newSecretKey
        }, { where: {
            user_id: userId
        }}
    );

const deleteUser = async(userId, t = null) => await User.destroy({
    where: {user_id: userId}
}, { transaction: t});

const updateUserPloggingData = async(updatedPloggingData, userId, t) => await User.update({
        score_week: updatedPloggingData.score_week,
        distance_week: updatedPloggingData.distance_week,
        trash_week: updatedPloggingData.trash_week,
        score_month: updatedPloggingData.score_month,
        distance_month: updatedPloggingData.distance_month,
        trash_month: updatedPloggingData.trash_month
    },
    { where: {user_id: userId}},
    { transaction: t});


module.exports = {
    findOneUser,
    createUser,
    updateUserName,
    updateUserImg,
    changeUserPassword,
    deleteUser,
    updateUserPloggingData
}