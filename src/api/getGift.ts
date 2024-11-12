import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {FastifyReply} from "fastify";

export default async function methodGetGift(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.id === null || body.id === '') {
        return apiReplyErr(reply, apiErrServerError)
    }
    const gift = await DatabaseHelper.getGift(body.id!)
    if (gift instanceof Error) {
        return apiReplyErr(reply, apiErrServerError)
    } else {
        return apiReplyOk(reply, gift)
    }
}