import {apiErrNotFound, apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {logError} from "../logs";
import {FastifyReply} from "fastify";

export default async function methodGetUserPlace(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.telegram_id === undefined || body.telegram_id === 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const userPlace = await DatabaseHelper.getUserPlace(body.telegram_id)
    return apiReplyOk(reply, userPlace)
}