import {apiErrServerError, apiReplyErr, apiReplyOk, APIRequest, APIUser} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {logError} from "../logs";
import {FastifyReply} from "fastify";
import {clearInterval} from "node:timers";
import {Action, Gift, GiftId} from "../types";

export default async function methodCheckInvoiceProcessed(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.invoice_id === null || body.invoice_id === 0) {
        return apiReplyErr(reply, apiErrServerError)
    }
    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            const purchaseActionId = await DatabaseHelper.checkInvoiceMarkedAsProcessed(body.invoice_id!)
            if (purchaseActionId instanceof Error) {
                logError(purchaseActionId)
                return apiReplyErr(reply, apiErrServerError)
            } else {
                if (purchaseActionId !== null) {
                    const action = await DatabaseHelper.getAction(purchaseActionId as string) as Action
                    action.gift = await DatabaseHelper.getGift(action.gift_id) as Gift
                    clearInterval(interval);
                    resolve(true)
                    apiReplyOk(reply, action)
                }
            }
        }, 1000);
        setTimeout(() => {
            clearInterval(interval)
            apiReplyOk(reply, false)
        }, 1000 * 100)
    });
}