import {
    apiErrAlreadyActivated,
    apiErrNotFound,
    apiErrServerError,
    apiReplyErr,
    apiReplyOk, APIRequest, APIUser
} from "../helpers/api.helper";
import DatabaseHelper from "../helpers/database.helper";
import {logError} from "../logs";
import {FastifyReply} from "fastify";
import {bot} from "../core";
import {lc} from "../locale";
import {f, fullName, htmlBold} from "../utils";
import {NewInlineKeyboardMarshalled, NewMainAppStartButton, NewWebAppButton} from "../BotAPI";

export default async function methodReceiveGift(user: APIUser, body: APIRequest, reply: FastifyReply) {
    if (body.action_id === undefined || body.action_id === '') {
        return apiReplyErr(reply, apiErrServerError)
    }
    const action = await DatabaseHelper.getAction(body.action_id)
    if (action instanceof Error) {
        logError(action)
        return apiReplyErr(reply, apiErrServerError)
    } else if (action === null) {
        return apiReplyErr(reply, apiErrNotFound)
    }
    if (action.target_action_id !== undefined) {
        return apiReplyErr(reply, apiErrAlreadyActivated)
    }

    const gift = await DatabaseHelper.getGift(action.gift_id)
    if (gift instanceof Error) {
        logError(gift)
        return apiReplyErr(reply, apiErrServerError)
    }
    action.gift = gift!
    const sender = await DatabaseHelper.getUser(action.actor_telegram_id)
    if (sender instanceof Error) {
        logError(sender)
        return apiReplyErr(reply, apiErrServerError)
    }
    action.user = sender!


    const receive = await DatabaseHelper.addReceive(user.id, action!.actor_telegram_id, action!.gift_id, action!._id)
    if (!receive) {
        return apiReplyErr(reply, apiErrServerError)
    } else {
        const lang = user.language_code || 'en'
        // Notify sender about receiving.
        bot.sendMessage(
            sender!.telegram_id,
            '👌 ' + f(lc(lang, 'gift_received_notify'), htmlBold(fullName(user.first_name, user.last_name)), htmlBold(gift!.name)),
            {
                reply_markup: NewInlineKeyboardMarshalled([NewMainAppStartButton(lc(lang, 'Open App'))]),
                parse_mode: 'HTML'
            }
        )
        // Notify receiver about receiving.
        bot.sendMessage(
            user!.id,
            '⚡️ ' + f(lc(lang, 'gift_activated_notify'), htmlBold(fullName(sender!.first_name, sender?.last_name)), htmlBold(gift!.name)),
            {
                reply_markup: NewInlineKeyboardMarshalled([NewMainAppStartButton(lc(lang, 'Open App'))]),
                parse_mode: 'HTML'
            }
        )
        return apiReplyOk(reply, action)
    }
}