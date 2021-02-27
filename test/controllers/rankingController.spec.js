const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
const httpMocks = require('node-mocks-http')
const { NotFound } = require('throw.js')
const { getGlobalRank, getUserRank } = require('../../controllers/rankingControllers')
const RankSchema = require('../../models/ranking')
const UserSchema = require('../../models/user')
const { expect } = require('chai')

chai.use(chaiAsPromised)

describe("rankingController test", () => {
    before(() => {
        const getCountAndRankDataWithScores = sinon.stub(RankSchema, "getCountAndRankDataWithScores")
        getCountAndRankDataWithScores.withArgs(RankSchema.SCORE_WEEKLY, 3, 16).returns(
            [97, [
                "mimi@naver.com:kakao", 1560,
                "happy@gmail.com:custom", 1380,
                "coco@naver.com:naver", 1200
            ]]
        )
        getCountAndRankDataWithScores.withArgs(RankSchema.SCORE_WEEKLY, 3, 0).returns([null, null])

        const getUserRankAndScore = sinon.stub(RankSchema, "getUserRankAndScore")
        getUserRankAndScore.withArgs(RankSchema.SCORE_WEEKLY, "mimi@naver.com:kakao").returns([45, 1560])
        getUserRankAndScore.withArgs(RankSchema.SCORE_WEEKLY, "nothing@gmail.com:custom").returns([null, null])

        const findUsers = sinon.stub(UserSchema, "findUsers")
        findUsers.withArgs(
            ["mimi@naver.com:kakao", "happy@gmail.com:custom", "coco@naver.com:naver"]
        ).returns(
            [
                {dataValues: {
                    user_id: "mimi@naver.com:kakao",
                    display_name: "미미",
                    profile_img: "some/path/to/img"
                }},
                {dataValues: {
                    user_id: "happy@gmail.com:custom",
                    display_name: "해피",
                    profile_img: "some/path/to/img"
                }},
                {dataValues: {
                    user_id: "coco@naver.com:naver",
                    display_name: "코코",
                    profile_img: "some/path/to/img"
                }}
            ]
        )

        const findOneUser = sinon.stub(UserSchema, "findOneUser")
        findOneUser.withArgs("mimi@naver.com:kakao").returns(
            {dataValues: {
                user_id: "mimi@naver.com:kakao",
                display_name: "미미",
                profile_img: "some/path/to/img"
            }}
        )

        const expect = chai.expect
    })

    it("getGlobalRank should create response in expected way", async () => {
        const req = httpMocks.createRequest({
            method: "GET",
            query: {
                rankType: "weekly",
                rankCntPerPage: 3,
                pageNumber: 16
            }
        })
        const res = httpMocks.createResponse()

        await getGlobalRank(req ,res)
        expect(200).equal(res.statusCode)
        const data = res._getJSONData()
        expect("success").equal(data.rcmsg)
        expect(1).equal(data.meta.startPageNumber)
        expect(33).equal(data.meta.endPageNumber)
        expect(16).equal(data.meta.currentPageNumber)
        expect(
            [
                {
                    userId: "mimi@naver.com:kakao",
                    displayName: "미미",
                    profileImg: "some/path/to/img",
                    score: 1560
                },
                {
                    userId: "happy@gmail.com:custom",
                    displayName: "해피",
                    profileImg: "some/path/to/img",
                    score: 1380
                },
                {
                    userId: "coco@naver.com:naver",
                    displayName: "코코",
                    profileImg: "some/path/to/img",
                    score: 1200
                },
            ]
        ).deep.equal(data.data)
    })

    it("getGlobalRank should throw NotFound if no data in Redis", () => {
        const req = httpMocks.createRequest({
            method: "GET",
            query: {
                rankType: "weekly",
                rankCntPerPage: 3,
                pageNumber: 0
            }
        })
        const res = httpMocks.createResponse()
        expect(getGlobalRank(req, res)).to.be.rejectedWith(NotFound)
    })

    it("getUserRank should create response in expected way", async () => {
        const req = httpMocks.createRequest({
            method: "GET",
            params: {id: "mimi@naver.com:kakao"},
            query: {rankType: "weekly"}
        })
        const res = httpMocks.createResponse()

        await getUserRank(req, res)
        expect(200).equal(res.statusCode)
        const data = res._getJSONData()
        expect("success").equal(data.rcmsg)
        expect({
            userId: "mimi@naver.com:kakao",
            displayName: "미미",
            profileImg: "some/path/to/img",
            rank: 45,
            score: 1560
        }).deep.equal(data.data)
    })

    it("getUserRank should throw NotFound if no data in Redis", () => {
        const req = httpMocks.createRequest({
            method: "GET",
            params: {id: "nothing@gmail.com:custom"},
            query: {rankType: "weekly"}
        })
        const res = httpMocks.createResponse()
        expect(getUserRank(req, res)).to.be.rejectedWith(NotFound)
    })
})