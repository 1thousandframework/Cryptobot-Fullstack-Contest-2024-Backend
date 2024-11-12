import DatabaseHelper from "../helpers/database.helper";
import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import {FastifyReply} from "fastify";

export default async function methodGetGifts(user: APIUser, body: APIRequest, reply: FastifyReply) {
    const gifts = await DatabaseHelper.getGifts()
    if (gifts === null) {
        return apiReplyErr(reply, apiErrServerError)
    } else {
        return apiReplyOk(reply, gifts)
    }
}