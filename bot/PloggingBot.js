const UserSchema = require('../models/user')
const PloggingSchema = require('../models/plogging')
const { writePlogging } = require('../controllers/ploggingControllers')
const logger = require("../util/logger.js")("ranking.js")
const schedule = require('node-schedule')
const httpMocks = require('node-mocks-http')
const randomNormal = require('random-normal')
const MAX_TRASH_TYPE = 6

function PloggingBot(id, name, profileImg, conf) {
    this.id = id
    this.name = name
    this.profileImg = profileImg
    this.conf = conf

    /**
     * 플로깅 봇을 생성한다. 이미 해당 ID가 있을 경우 스킵한다.
     */
    this.initialize = async () => {
        if (await UserSchema.findOneUser(this.id) == null) {
            UserSchema.createUser(this.id, this.name, this.profileImg)
            logger.info(`Initialized bot ${this.name}.`)
        } else {
            logger.info(`Skip initializing bot ${this.name} because it already exists.`)
        }
    }

    /**
     * 다음날의 플로깅 스케줄을 생성한다. 정해진 확률에 따라 플로깅 여부가 결정되고, 플로깅 기록 시점은 해당 봇의 설정에 따라 정해진다. 
     */
    this.schedulePlogging = async () => {
        if (Math.random() < this.conf.ploggingProbability) {
            const ploggingHour = this.getPloggingHour()
            const tomorrow = this.getTomorrowDate()
            const ploggingTime = new Date(tomorrow.getFullYear, tomorrow.getmonth,
                tomorrow.getDate, ploggingHour, this.getRandomMinute(), 0)
            schedule.scheduleJob(ploggingTime, this.plog)
            logger.info(`Scheduled plogging for bot ${this.name} at ${ploggingTime}`)
        } else {
            logger.info(`Skip Scheduling plogging for bot ${this.name}, the coin came up tail.`)
        }
    }

    /**
     * 플로깅이 등록될 수 있는 시간대를 구한다.
     */
    this.getPloggingHour = () => {
        return Math.floor(Math.random() * (
            this.conf.latestPloggingHour - this.conf.earliestPloggingHour
        ) + this.conf.earliestPloggingHour)
    }

    /**
     * 다음날의 date를 구한다.
     */
    this.getTomorrowDate = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
    }

    /**
     * 임의의 분을 구한다.
     */
    this.getRandomMinute = () => {
        return Math.floor(Math.random() * 60)
    }

    /**
     * 플로깅을 기록한다. 모든 플로깅 관련 스탯은 봇 설정에 정의된 각 스탯별 평균과 표준편차에 의해 랜덤하게 결정된다.
     */
    this.plog = async () => {
        const distance = Math.floor(randomNormal(conf.distanceParams))
        const calorie = Math.floor(randomNormal(conf.calorieParams))
        const ploggingTime = Math.floor(randomNormal(conf.ploggingTimeParams))
        const trashCount = Math.floor(randomNormal(conf.trashCountParams))
        const trashList = this.generateRandomTrashList(trashCount)
        const ploggingData = {
            meta: {
                distance: distance,
                calorie: calorie,
                plogging_time: ploggingTime
            },
            trash_list: trashList
        }
        const req = httpMocks.createRequest({
            method: "POST",
            body: {
                ploggingData: JSON.stringify(ploggingData)
            }
        })
        req.userId = this.id
        const res = httpMocks.createResponse()
        writePlogging(req, res)
    }

    /**
     * 각 쓰레기 종류별로 쓰레기 갯수를 랜덤하게 할당해서 플로깅 데이터의 trash_list에 들어갈 오브젝트를 생성한다.
     */
    this.generateRandomTrashList = trashCount => {
        const checkpoints = [0]
        for(let i=0; i < MAX_TRASH_TYPE - 1; i++) {
            checkpoints.push(Math.floor(Math.random() * trashCount))
        }
        checkpoints.push(trashCount)
        checkpoints.sort((a, b) => (a - b))
        const trashList = []
        for(let i=1; i < checkpoints.length; i++) {
            let trashType = i
            let pickCount = checkpoints[i] - checkpoints[i-1]
            if (pickCount) {
                trashList.push({ trash_type: trashType, pick_count: pickCount })
            }
        }
        return trashList
    }
}

module.exports = PloggingBot