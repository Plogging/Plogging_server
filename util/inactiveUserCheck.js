const UserSchema = require('../models/user.js');
const schedule = require('node-schedule');
const controller = require('../controllers/userControllers')


module.exports = async() => {
    schedule.scheduleJob('* * 0 * * *', async function(){
        await UserSchema.updateInactiveUser();
        const user = await UserSchema.findInactiveUser();
        const users = user.map(it => it.email)
        if(users.length() > 0) controller.sendEmail('inactiveAccount',users)
    });
}