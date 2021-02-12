const sqlite = require('sqlite3').verbose()
const { Sequelize } = require('sequelize')
const { expect } = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

let sequelize, User, UserSchema

describe("user model test", () => {
    before(() => {
        sequelize = new Sequelize("sqlite::memory:")
        User = require('../../models/userModel')(sequelize, Sequelize)
        UserSchema = proxyquire("../../models/user", {
            "./index": {
                sequelize: sequelize
            }
        })
    })

    beforeEach(async () => {
        await sequelize.sync()
    })

    afterEach(async () => {
        await User.drop()
    })

    it("findOneUser should return one row", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            secret_key: "mimi1234"
        }
        await User.create(user)
        const expected = user
        expected.score_month = 0
        expected.distance_month = 0
        expected.trash_month = 0
        expected.score_week = 0
        expected.distance_week = 0
        expected.trash_week = 0
        const actual = (await UserSchema.findOneUser(user.user_id)).dataValues
        expect(expected.user_id).equal(actual.user_id)
        expect(expected.display_name).equal(actual.display_name)
        expect(expected.profile_img).equal(actual.profile_img)
        expect(expected.type).equal(actual.type)
        expect(expected.email).equal(actual.email)
        expect(expected.secret_key).equal(actual.secret_key)
        expect(expected.score_month).equal(actual.score_month)
        expect(expected.distance_month).equal(actual.distance_month)
        expect(expected.trash_month).equal(actual.trash_month)
        expect(expected.score_week).equal(actual.score_week)
        expect(expected.distance_week).equal(actual.distance_week)
        expect(expected.trash_week).equal(actual.trash_week)
    })

    it("findUsers should return all users", async () => {
        const users = [
            {
                user_id: "mimi@naver.com:naver",
                display_name: "미미",
                profile_img: "some/path/to/img",
                type: "naver",
                email: "mimi@naver.com",
                secret_key: "mimi1234"
            }, {
                user_id: "happy@kakao.com:kakao",
                display_name: "해피",
                profile_img: "some/path/to/img",
                type: "kakao",
                email: "happy@kakao.com",
                secret_key: "happy1234"
            }, {
                user_id: "coco@gmail.com:custom",
                display_name: "코코",
                profile_img: "some/path/to/img",
                type: "custom",
                email: "coco@gmail.com",
                secret_key: "coco1234"
            }
        ]
        await User.bulkCreate(users)
        const result = await UserSchema.findUsers(users.map(e => e.user_id))
        expect(3).equal(result.length)
    })

    it("createUser should create user instance", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            secret_key: "mimi1234"
        }
        await UserSchema.createUser(user.user_id, user.display_name, user.profile_img,
            user.secret_key)
        const expected = user
        expected.type = "naver"
        expected.email = "mimi@naver.com"
        expected.score_month = 0
        expected.distance_month = 0
        expected.trash_month = 0
        expected.score_week = 0
        expected.distance_week = 0
        expected.trash_week = 0
        const actual = (await User.findOne({
            where: { user_id: user.user_id }
        })).dataValues
        expect(expected.user_id).equal(actual.user_id)
        expect(expected.display_name).equal(actual.display_name)
        expect(expected.profile_img).equal(actual.profile_img)
        expect(expected.type).equal(actual.type)
        expect(expected.email).equal(actual.email)
        expect(expected.secret_key).equal(actual.secret_key)
        expect(expected.score_month).equal(actual.score_month)
        expect(expected.distance_month).equal(actual.distance_month)
        expect(expected.trash_month).equal(actual.trash_month)
        expect(expected.score_week).equal(actual.score_week)
        expect(expected.distance_week).equal(actual.distance_week)
        expect(expected.trash_week).equal(actual.trash_week)
    })

    it("updateUserName should update user name", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            secret_key: "mimi1234"
        }
        await User.create(user)
        const expected = "나는미미"
        await UserSchema.updateUserName(user.user_id, expected)
        const actual = (await User.findOne({
            where: { user_id: user.user_id }
        })).dataValues.display_name
        expect(expected).equal(actual)
    })

    it("updateUserImg should update user image", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            secret_key: "mimi1234"
        }
        await User.create(user)
        const expected = "other/path/to/img"
        await UserSchema.updateUserImg(user.user_id, expected)
        const actual = (await User.findOne({
            where: { user_id: user.user_id }
        })).dataValues.profile_img
        expect(expected).equal(actual)
    })

    it("changeUserPassword should change user's password", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            secret_key: "mimi1234"
        }
        await User.create(user)
        const expected = "mimi4321"
        await UserSchema.changeUserPassword(user.user_id, expected, user.secret_key)
        const actual = (await User.findOne({
            where: { user_id: user.user_id }
        })).dataValues.secret_key
        expect(expected).equal(actual)
    })

    it("deleteUser should delete user", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            secret_key: "mimi1234"
        }
        await User.create(user)
        await UserSchema.deleteUser(user.user_id)
        const result = await User.findOne({
            where: { user_id: user.user_id }
        })
        expect(null).equal(result)
    })

    it("updateUserPloggingData should update user's plogging data", async () => {
        const user = {
            user_id: "mimi@naver.com:naver",
            display_name: "미미",
            profile_img: "some/path/to/img",
            type: "naver",
            email: "mimi@naver.com",
            secret_key: "mimi1234"
        }
        await User.create(user)
        const updatedPloggingData = {
            scoreWeek: 300,
            distanceWeek: 1500,
            trashWeek: 10,
            scoreMonth: 900,
            distanceMonth: 3000,
            trashMonth: 50
        }
        await UserSchema.updateUserPloggingData(updatedPloggingData, user.user_id)
        const expected = updatedPloggingData
        const actual = (await User.findOne({
            where: { user_id: user.user_id }
        })).dataValues
        expect(expected.scoreWeek).equal(actual.score_week)
        expect(expected.distanceWeek).equal(actual.distance_week)
        expect(expected.trashWeek).equal(actual.trash_week)
        expect(expected.scoreMonth).equal(actual.score_month)
        expect(expected.distanceMonth).equal(actual.distance_month)
        expect(expected.trashMonth).equal(actual.trash_month)
    })
})