import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import {FastifyReply} from "fastify";
import DatabaseHelper from "../helpers/database.helper";

export default async function methodGetLeaders(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.offset === undefined || body.offset < 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    const result = await DatabaseHelper.getLeaders(body.offset)
    if (result instanceof Error) {
        return apiReplyErr(reply, apiErrServerError)
    } else {
        return apiReplyOk(reply, result)
    }
}