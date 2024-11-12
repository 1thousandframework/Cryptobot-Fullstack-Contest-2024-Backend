import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import DatabaseHelper, {ACTION_TYPE_PURCHASE, ACTION_TYPE_SEND} from "../helpers/database.helper";
import {FastifyReply} from "fastify";
import {Action, Gift, User} from "../types";

export default async function methodGetGiftRecentActions(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.gift_id === undefined || body.gift_id === '') {
        return apiReplyErr(reply, apiErrServerError)
    }
    if (body.offset === undefined || body.offset < 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const actions = await DatabaseHelper.getGiftActions(body.gift_id, body.offset)
    if (actions instanceof Error) {
        return apiReplyErr(reply, apiErrServerError)
    }
    for (let i = 0; i < actions.length; i++) {
        actions[i].user = await DatabaseHelper.getUser(actions[i].actor_telegram_id) as User
        actions[i].gift = await DatabaseHelper.getGift(actions[i].gift_id) as Gift
        if (actions[i].action_type === ACTION_TYPE_SEND) {
            const targetAction = await DatabaseHelper.getAction(actions[i].target_action_id!) as Action
            actions[i].target_user = await DatabaseHelper.getUser(targetAction.actor_telegram_id) as User
        }
    }
    return apiReplyOk(reply, actions)
}