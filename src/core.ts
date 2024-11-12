// This file contains initializing all main components needed for working app.
import fastify from "fastify";
import {Database} from "./Database";
import {
    BotAPI,
    Message, NewBotStartButton,
    NewInlineKeyboard, NewInlineKeyboardMarshalled, NewMainAppStartButton,
    NewWebAppButton,
    Update,
    User
} from "./BotAPI";
import {base64ToHex, createDirIfNotExists, f, giftPreviewByAliasName} from "./utils";
import {logError, logToTelegram} from "./logs";
import CryptoPay from "./CryptoPay";
import {BOT_API_KEY, CRYPTO_PAY_KEY, DB_NAME, DB_PASS, DB_USERNAME, DEBUG_BOT_API_KEY, HOSTNAME} from "./config";
import DatabaseHelper from "./helpers/database.helper";
import {lc} from "./locale";
import {Cache} from "./cache";

// initDirectories creates directories in working directory if they are NOT exists.
export function initDirectories() {
    createDirIfNotExists('/logs')
    createDirIfNotExists('/avatars')
}

export const app = fastify({logger: false})
export async function initWebserver() {
    try {
        app.addHook('preHandler', (req, res, done) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header("Access-Control-Allow-Methods", "*");
            res.header("Access-Control-Allow-Headers",  "*");
            const isPreflight = /options/i.test(req.method);
            if (isPreflight) {
                return res.send();
            }
            done()
        })
        const port = 3000
        await app.listen({port: port})
        console.log('Webserver started at port:', port)
    } catch (err) {
        await logError(err)
        process.exit(1)
    }
}

export let cryptoPay: CryptoPay
export function initCryptoPay() {
    cryptoPay = new CryptoPay(CRYPTO_PAY_KEY)
}

export const giftIdRegex = /^[a-f0-9]{24}$/

// App's bot.
export let bot: BotAPI
// Bot for receiving log messages.
export let loggerBot: BotAPI
// initTelegramBots create instances
export async function initTelegramBots () {
    bot = new BotAPI(BOT_API_KEY)
    // onPrehandle handles update before passing it to other formulaic handlers.
    // If return false, passing doesn't happen.
    bot.onPreHandle((upd: Update): boolean => {
        let user: User | undefined
        if (upd.message !== undefined) {
            if (upd.message.chat.type === 'private') {
                user = upd.message.from
            }
        }
        if (user !== undefined) {
            DatabaseHelper.addUserIfNotExists(user.id, user.first_name, user.last_name, user.is_premium || false)
        }
        return true
    })
    // Setting global error handler.
    bot.onError((err) => {
        logError(err)
    })
    // /start command handler.
    bot.onCommand('start', async (lang: string, msg: Message) => {
        if (msg.chat.type !== 'private') return
        DatabaseHelper.getMenuMsgId(msg.chat.id).then(async (menuMsgId) => {
            if (menuMsgId instanceof Error) {
                logError(menuMsgId)
            } else {
                if (menuMsgId !== 0) {
                    await bot.deleteMessage(msg.chat.id, menuMsgId)
                }
            }
        })
        const message = await bot.sendPhoto(msg.chat.id, 'https://' + HOSTNAME + '/img/greeting.png', lc(lang, 'hello_msg'), {
            reply_markup: NewInlineKeyboardMarshalled([NewWebAppButton(lc(lang, 'Open App'), '')])
        })
        if (message instanceof Error) {
            logToTelegram(message)
        } else {
            bot.deleteMessage(msg.chat.id, msg.message_id)
            DatabaseHelper.setMenuMsgId(msg.chat.id, message.message_id)
        }
    })
    // Inline query handler.
    bot.onInlineQuery(async (query) => {
        if (giftIdRegex.test(query.query)) {
            const purchaseActionId = query.query
            const action = await DatabaseHelper.getAction(purchaseActionId)
            if (action instanceof Error) {
                logError(action)
            } else if (action !== null) {
                if (action.actor_telegram_id !== query.from.id) {
                    // Access forbidden.
                    return
                }
                const lang = query.from.language_code || 'en'
                const gift = await DatabaseHelper.getGift(action.gift_id)
                if (gift instanceof Error) {
                    logError(gift)
                    return
                }
                bot.answerInlineQuery(query.id, [
                    {
                        id: action._id,
                        type: 'article',
                        // reply_markup: NewInlineKeyboard([NewBotStartButton(lc(lang, 'Receive Gift'), 'receive_' + action._id)]),
                        reply_markup: NewInlineKeyboard([NewMainAppStartButton(lc(lang, 'Receive Gift'), 'receive_' + action._id)]),
                        description: f(lc(lang, 'send_gift_desc'), gift!.name),
                        title: lc(lang, 'Send Gift'),
                        thumbnail_url: giftPreviewByAliasName(gift!.animation),
                        input_message_content: {
                            message_text: lc(lang, 'gift_offer'),
                            parse_mode: 'HTML'
                        },
                    }
                ])
            } else {
                console.log('Not found')
            }
        } else {
            console.log('No match')
        }
    })

    const botInfo = await bot.getMe()
    if (botInfo instanceof Error) {
        console.log('Can\'t initialize the Telegram bot because couldn\'t get its username.')
        await logError(botInfo)
        process.exit(1)
    } else {
        bot.username = botInfo.username
    }

    if (DEBUG_BOT_API_KEY !== '') {
        loggerBot = new BotAPI(DEBUG_BOT_API_KEY)
    }
}

export let db: Database
export async function initDatabase() {
    db = new Database({
        databaseName: DB_NAME,
        username: DB_USERNAME,
        password: DB_PASS,
    })
    const error = await db.connect()
    if (error === true) {
        console.log('Connected to MongoDB')
    } else {
        await logError(error)
        process.exit(1)
    }
}

export async function initCache() {
    const gifts = await DatabaseHelper.getGifts()
    if (gifts !== null) {
        for (let gift of gifts) {
            Cache.supply.set(gift._id!, gift.supply)
            Cache.purchasedCount.set(gift._id!, {value: gift.purchased_count})
        }
    } else {
        console.log('Can\'t load gifts.')
        process.exit(1)
    }
}