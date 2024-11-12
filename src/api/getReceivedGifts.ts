import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import {FastifyReply} from "fastify";
import DatabaseHelper from "../helpers/database.helper";
import {Action, Gift, User} from "../types";

export default async function methodGetReceivedGifts(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.telegram_id === undefined || body.telegram_id === 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    if (body.offset === undefined || body.offset < 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const result = await DatabaseHelper.getReceivedGifts(body.telegram_id, body.offset)
    if (result !== null) {
        for (let i = 0; i < result.length; i++) {
            result[i].gift = await DatabaseHelper.getGift(result[i].gift_id) as Gift
            const targetAction = await DatabaseHelper.getAction(result[i].target_action_id!) as Action
            result[i].target_action = targetAction
            result[i].target_user = await DatabaseHelper.getUser(targetAction.actor_telegram_id) as User
            result[i].gift!.availability = await DatabaseHelper.getGiftAvailability(targetAction._id)
        }
        apiReplyOk(reply, result)
    } else {
        apiReplyErr(reply, apiErrServerError)
    }
}