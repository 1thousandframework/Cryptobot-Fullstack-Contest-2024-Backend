import {apiErrNotFound, apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {logError} from "../logs";
import {FastifyReply} from "fastify";

export default async function methodGetUser(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.telegram_id === undefined || body.telegram_id === 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const maybeUser = await DatabaseHelper.getUser(body.telegram_id)
    if (maybeUser instanceof Error) {
        logError(maybeUser)
        return apiReplyErr(reply, apiErrServerError)
    } else if (maybeUser === null) {
        return apiReplyErr(reply, apiErrNotFound)
    } else {
        return apiReplyOk(reply, maybeUser)
    }
}