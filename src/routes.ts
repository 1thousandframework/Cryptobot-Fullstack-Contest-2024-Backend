// router.ts contains

import {FastifyReply, FastifyRequest} from 'fastify'
import {BOT_API_KEY, CRYPTO_PAY_KEY} from "./config"
import DatabaseHelper from "./helpers/database.helper";
import {cryptoPayWebhookHandler} from "./CryptoPay";
import {app, bot} from "./core";
import methodGetHistory from "./api/getHistory";
import {
    apiErrAuthFailed, apiErrJsonExpected, apiErrServerError,
    apiErrUserDataRequired,
    apiReplyErr,
    apiReplyOk,
    APIRequest,
    checkUserDataValidity
} from "./helpers/api.helper";
import methodReceiveGift from "./api/receiveGift";
import methodGetUnsentGifts from "./api/getUnsentGifts";
import methodGetGiftRecentActions from "./api/getGiftRecentActions";
import methodGetUser from "./api/getUser";
import methodCheckInvoiceProcessed from "./api/checkInvoiceProcessed";
import methodCreateInvoice from "./api/createInvoice";
import methodGetGift from "./api/getGift";
import methodGetGifts from "./api/getGifts";
import methodGetReceivedGifts from "./api/getReceivedGifts";
import methodGetLeaders from "./api/getLeaders";
import methodGetUserPlace from "./api/getUserPlace";

// fastifyEscapeSpecialChars escape special chars such as ":" to make it part of path,
// but not a parameter.
export function fastifyEscapeSpecialChars(str: string): string {
    return str.replace(/:/g, '::')
}


// Typescript crutch as request.params doesn't have a type.
interface FastifyRequestParams {
    methodName: string
}

// initRoutes initializes web server path handlers.
export function initRoutes() {
    app.post(fastifyEscapeSpecialChars('/webhooks/' + CRYPTO_PAY_KEY), cryptoPayWebhookHandler)

    app.post(fastifyEscapeSpecialChars('/webhooks/' + BOT_API_KEY), (request: FastifyRequest, reply: FastifyReply) => {
        bot.router.call(bot, request, reply)
    })

    app.post('/api/:methodName', async (request: FastifyRequest, reply: FastifyReply) => {
        const { methodName } = request.params as FastifyRequestParams
        if (request.headers["content-type"] !== 'application/json') {
            apiReplyErr(reply, apiErrJsonExpected)
            return undefined
        }
        const body = request.body as APIRequest
        if (body.user_data === undefined) {
            apiReplyErr(reply, apiErrUserDataRequired)
            return undefined
        }
        const user = checkUserDataValidity(body.user_data)
        if (user === undefined) {
            apiReplyErr(reply, apiErrAuthFailed)
            return undefined
        }
        // Add user if not exists.
        await DatabaseHelper.addUserIfNotExists(user.id, user.first_name, user.last_name)
        if (methodName === 'getGifts') {
            await methodGetGifts(user, body, reply)
        } else if (methodName === 'getGift') {
            await methodGetGift(user, body, reply)
        } else if (methodName === 'createInvoice') {
            await methodCreateInvoice(user, body, reply)
        } else if (methodName === 'checkInvoiceProcessed') {
            await methodCheckInvoiceProcessed(user, body, reply)
        } else if (methodName === 'getUser') {
            await methodGetUser(user, body, reply)
        } else if (methodName === 'getGiftRecentActions') {
            await methodGetGiftRecentActions(user, body, reply)
        } else if (methodName === 'getUnsentGifts') {
            await methodGetUnsentGifts(user, body, reply)
        } else if (methodName === 'receiveGift') {
            await methodReceiveGift(user, body, reply)
        } else if (methodName === 'getHistory') {
            await methodGetHistory(user, body, reply)
        } else if (methodName === 'getReceivedGifts') {
            await methodGetReceivedGifts(user, body, reply)
        } else if (methodName === 'getLeaders') {
            await methodGetLeaders(user, body, reply)
        } else if (methodName === 'getUserPlace') {
            await methodGetUserPlace(user, body, reply)
        }
    })
}