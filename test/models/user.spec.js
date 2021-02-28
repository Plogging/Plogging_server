const sqlite = require('sqlite3').verbose()
const { Sequelize } = require('sequelize')
const { expect } = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const crypto = require('crypto')

let sequelize, User, UserSchema
let user

describe("user model test", () => {
    before(async () => {
        sequelize = new Sequelize("sqlite::memory:")
        User = require('../../models/userModel')(sequelize, Sequelize)
        UserSchema = proxyquire("../../models/user", {
            "./index": {
                sequelize: sequelize
            }
        })
        const secretKey = "mimi1234"
        const salt = (await crypto.randomBytes(32)).toString('hex')
        const digest = crypto.pbkdf2Sync(secretKey, salt, 10000, 64, 'sha512').toString('base64')
        user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            digest: digest,
            salt: salt
        }
    })

    beforeEach(async () => {
        await sequelize.sync()
    })

    afterEach(async () => {
        await User.drop()
    })

    it("findOneUser should return one row", async () => {
        await User.create(user)
        const expected = user
        const actual = (await UserSchema.findOneUser(user.user_id)).dataValues
        expect(expected.user_id).equal(actual.user_id)
        expect(expected.display_name).equal(actual.display_name)
        expect(expected.profile_img).equal(actual.profile_img)
        expect(expected.type).equal(actual.type)
        expect(expected.email).equal(actual.email)
        expect(expected.digest).equal(actual.digest)
        expect(expected.salt).equal(actual.salt)
    })

    it("findUsers should return all users", async () => {
        const users = [
            {
                user_id: "mimi@naver.com:naver",
                display_name: "미미",
                profile_img: "some/path/to/img",
                type: "naver",
                email: "mimi@naver.com",
                digest: user.digest,
                salt: user.salt
            }, {
                user_id: "happy@kakao.com:kakao",
                display_name: "해피",
                profile_img: "some/path/to/img",
                type: "kakao",
                email: "happy@kakao.com",
                digest: user.digest,
                salt: user.salt
            }, {
                user_id: "coco@gmail.com:custom",
                display_name: "코코",
                profile_img: "some/path/to/img",
                type: "custom",
                email: "coco@gmail.com",
                digest: user.digest,
                salt: user.salt
            }
        ]
        await User.bulkCreate(users)
        const result = await UserSchema.findUsers(users.map(e => e.user_id))
        expect(3).equal(result.length)
    })

    it("createUser should create user instance", async () => {
        await UserSchema.createUser(user.user_id, user.display_name, user.profile_img,
            user.digest, user.salt)
        const expected = user
        expected.type = "naver"
        expected.email = "mimi@naver.com"
        const actual = (await User.findOne({
            where: { user_id: user.user_id, digest: user.digest }
        })).dataValues
        expect(expected.user_id).equal(actual.user_id)
        expect(expected.display_name).equal(actual.display_name)
        expect(expected.profile_img).equal(actual.profile_img)
        expect(expected.type).equal(actual.type)
        expect(expected.email).equal(actual.email)
        expect(expected.digest).equal(actual.digest)
        expect(expected.salt).equal(actual.salt)
    })

    it("updateUserName should update user name", async () => {
        await User.create(user)
        const expected = "나는미미"
        await UserSchema.updateUserName(user.user_id, expected)
        const actual = (await User.findOne({
            where: { user_id: user.user_id, digest: user.digest }
        })).dataValues.display_name
        expect(expected).equal(actual)
    })

    it("updateUserImg should update user image", async () => {
        await User.create(user)
        const expected = "other/path/to/img"
        await UserSchema.updateUserImg(user.user_id, expected)
        const actual = (await User.findOne({
            where: { user_id: user.user_id, digest: user.digest }
        })).dataValues.profile_img
        expect(expected).equal(actual)
    })

    it("changeUserPassword should change user's password", async () => {
        await User.create(user)
        const newSecretKey = "mimi4321"
        const newDigest = crypto.pbkdf2Sync(newSecretKey, user.salt, 10000, 64, 'sha512').toString('base64') 
        await UserSchema.changeUserPassword(user.user_id, newDigest, user.salt, user.digest)
        const expected = newDigest
        const actual = (await User.findOne({
            where: { user_id: user.user_id }
        })).dataValues.digest
        expect(expected).equal(actual)
    })

    it("deleteUser should delete user", async () => {
        await User.create(user)
        await UserSchema.deleteUser(user.user_id)
        const result = await User.findOne({
            where: { user_id: user.user_id }
        })
        expect(null).equal(result)
    })
})