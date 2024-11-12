import {FastifyReply} from "fastify";
import DatabaseHelper, {ACTION_TYPE_PURCHASE} from "../helpers/database.helper";
import {Action, Gift, User} from "../types";
import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";

export default async function methodGetHistory(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.offset === undefined || body.offset < 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const actions = await DatabaseHelper.getUserActions(user.id, body.offset)
    if (actions instanceof Error) {
        return apiReplyErr(reply, apiErrServerError)
    }
    for (let i = 0; i < actions.length; i++) {
        actions[i].gift = await DatabaseHelper.getGift(actions[i].gift_id) as Gift
        if (actions[i].action_type !== ACTION_TYPE_PURCHASE) {
            const relatedAction = await DatabaseHelper.getAction(actions[i].target_action_id!) as Action
            actions[i].user = await DatabaseHelper.getUser(relatedAction.actor_telegram_id) as User
        }
    }

    return apiReplyOk(reply, actions)
}