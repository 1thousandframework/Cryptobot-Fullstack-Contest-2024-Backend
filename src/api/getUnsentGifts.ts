import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {FastifyReply} from "fastify";
import {Gift} from "../types";

export default async function methodGetUnsentGifts(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.offset === undefined || body.offset < 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const actions = await DatabaseHelper.getUnsentGifts(user.id, body.offset)
    if (actions instanceof Error) {
        return apiReplyErr(reply, apiErrServerError)
    }
    for (let i = 0; i < actions.length; i++) {
        actions[i].gift = await DatabaseHelper.getGift(actions[i].gift_id) as Gift
        actions[i].gift!.availability = await DatabaseHelper.getGiftAvailability(actions[i]._id)
    }
    return apiReplyOk(reply, actions)
}