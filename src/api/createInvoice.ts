import {
    apiErrCantCreateInvoice,
    apiErrNotFound,
    apiErrOutOfGift,
    apiErrServerError,
    apiReplyErr, apiReplyOk, APIRequest, APIUser
} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {logError} from "../logs";
import {Cache} from "../cache";
import {cryptoPay} from "../core";
import {f} from "../utils";
import {lc} from "../locale";
import {INVOICE_LIFETIME} from "../config";
import {CryptoPayInvoice} from "../CryptoPay";
import {PaymentUrlData} from "../types";
import {FastifyReply} from "fastify";

export default async function methodCreateInvoice(user: APIUser, body: APIRequest, reply: FastifyReply) {
    const lang = body.lang || 'en'
    if (body.id === null || body.id === '') {
        return apiReplyErr(reply, apiErrServerError)
    }
    // Getting gift info.
    const gift = await DatabaseHelper.getGift(body.id!)
    if (gift instanceof Error) {
        logError(gift)
        return apiReplyErr(reply, apiErrServerError)
    } else if (gift === null) {
        return apiReplyErr(reply, apiErrNotFound)
    } else {
        // Checking if cached purchased count equals or more gift supply.
        if (Cache.purchasedCount.get(body.id!)!.value >= gift.supply) {
            return apiReplyErr(reply, apiErrOutOfGift)
        }

        // Creating CryptoPay invoice.
        const resp = await cryptoPay.createInvoice({
            amount: '1.1',
            asset: 'USDT',
            description: f(lc(lang, 'gift_buy_desc'), gift.name),
            payload: [gift._id, user.id, user.language_code || 'en'].join(' '),
            expired_in: INVOICE_LIFETIME
        })
        if (resp instanceof Error) {
            logError(resp)
            return apiReplyErr(reply, apiErrCantCreateInvoice)
        } else {
            if (!resp.ok) {
                console.log(resp)
                logError(resp)
                return apiReplyErr(reply, apiErrCantCreateInvoice)
            }
            const invoice = resp.result as CryptoPayInvoice

            // Temporary increment purchased count...
            Cache.purchasedCount.get(gift._id!)!.value++
            // ...and decrement it after invoice lifetime expired.
            setTimeout(() => {
                Cache.purchasedCount.get(gift._id!)!.value--
            }, INVOICE_LIFETIME * 1000)

            return apiReplyOk(reply, {
                invoice_id: invoice.invoice_id,
                mini_app_url: invoice.mini_app_invoice_url,
                bot_url: invoice.bot_invoice_url
            } as PaymentUrlData)
        }
    }
}