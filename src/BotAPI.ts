import {ErrCantParseTelegramUpdate, ErrServerError} from "./errors"
import {FastifyReply, FastifyRequest} from "fastify"
import {HOSTNAME} from "./config"
import {isObject} from "./utils";
import {bot} from "./core";

export interface Body {
    chat_id?: number | string
    message_id?: number
    text?: string
    url?: string
    allowed_updates?: string
    reply_markup?: string
    parse_mode?: string
    commands?: string,
    language_code?: string
    inline_query_id?: string
    results?: string
    cache_time?: number
    user_id?: number
    offset?: number
    limit?: number
    file_id?: string,
    photo?: string,
    caption?: string,
}

export interface InlineKeyboardMarkup {
    inline_keyboard: Array<Array<InlineKeyboardButton>>
}

export function NewInlineKeyboard(...rows: Array<Array<InlineKeyboardButton>>): InlineKeyboardMarkup {
    return {
        inline_keyboard: rows,
    }
}

export function NewInlineKeyboardMarshalled(...rows: Array<Array<InlineKeyboardButton>>): string {
    return JSON.stringify(NewInlineKeyboard(...rows))
}

export function NewWebAppButton(text: string, url: string): InlineKeyboardButton {
    return {
        text: text,
        web_app: {
            url: 'https://' + HOSTNAME + '/' + url,
        }
    }
}

export function NewBotStartButton(text: string, param: string): InlineKeyboardButton {
    return {
        text: text,
        url: 'https://t.me/' + bot.username + (param ? '?start=' + param : '')
    }
}

export function NewMainAppStartButton(text: string, param?: string): InlineKeyboardButton {
    return {
        text: text,
        url: 'https://t.me/' + bot.username + '/app' + (param ? '?startapp=' + param : '')
    }
}

export interface InlineKeyboardButton {
    text: string
    url?: string
    callback_data?: string
    web_app?: WebAppInfo
}

export interface WebAppInfo {
    url: string
}

export interface Response {
    ok: boolean
    result: any
    error_code?: number
    description?: string
}

export interface Update {
    update_id: number
    message?: Message
    inline_query?: InlineQuery
}

export interface InlineQuery {
    id: string
    from: User
    query: string
}

export interface Message {
    message_id: number
    from: User
    date: number
    chat: Chat
    text?: string
}

export interface User {
    id: number
    is_bot: boolean
    first_name: string
    last_name: string
    username: string
    is_premium?: boolean
    language_code?: string
}

export interface InlineQueryResult {
    type: string
    id: string
    title?: string
    input_message_content?: InputMessageContent
    reply_markup?: InlineKeyboardMarkup
    description?: string
    thumbnail_url?: string
}

export interface InputMessageContent {
    message_text?: string
    parse_mode?: string
}

export interface BotCommand {
    command: string
    description: string
}

export interface Chat {
    id: number
    type: string
}

export interface UserProfilePhotos {
    total_count: number
    photos: PhotoSize[][]
}

export interface PhotoSize {
    file_id: string
    file_unique_id: string
}

export interface File {
    file_path: string
}

export class BotAPI {
    private readonly _token: string
    private _onError!: (err: Error) => void
    private _commands = new Map<string, (lang: string, msg: Message) => void>()
    private _commandsRegex: [RegExp, (lang: string, msg: Message, params: string[]) => void][] = []
    private _onInlineQuery!: (query: InlineQuery) => void
    private _username: string = ''
    private _preHandleCallback!: (upd: Update) => boolean

    constructor(token: string) {
        this._token = token
    }


    miniAppButton(text: string, appName: string): InlineKeyboardButton {
        return {
            text: text,
            web_app: {
                url: 'https://t.me/' + this.username + '/' + appName,
            }
        }
    }

    set username(newUsername: string) {
        this._username = newUsername
    }
    get username(): string {
        return this._username
    }

    get token(): string {
        return this._token
    }

    public router(request: FastifyRequest, reply: FastifyReply) {
        if (!isObject(request.body)) {
            if (this._onError !== undefined) {
                this._onError(ErrCantParseTelegramUpdate)
            }
            reply.status(500).send({ message: 'Internal Server Error' })
            return
        }
        let update!: Update
        update = request.body as Update
        if (this._preHandleCallback !== undefined) {
            if (!this._preHandleCallback(update)) {
                reply.send('Ok!')
                return
            }
        }
        if (update.message !== undefined) {
            if (update.message.chat.type === 'private') {
                if (update.message.text !== undefined) {
                    const lang = update.message!.from?.language_code || 'en'
                    for (const [command, callback] of this._commands) {
                        if (command === update.message.text) {
                            callback(lang, update.message)
                            reply.send('Ok!')
                            return
                        }
                    }
                    for (const [regex, callback] of this._commandsRegex) {
                        const matches = update.message.text.match(regex)
                        if (matches !== null) {
                            matches.shift()
                            callback(lang, update.message, matches)
                        }
                    }
                }
            }
        } else if (update.inline_query !== undefined) {
            if (this._onInlineQuery) {
                this._onInlineQuery(update.inline_query)
            }
        }
        reply.send('')
    }

    private async _call(methodName: string, params?: Body): Promise<Response | Error> {
        try {
            const result = await fetch('https://api.telegram.org/bot' + this._token + '/' + methodName, {
                method: 'POST',
                body: params ? JSON.stringify(params) : null,
                headers: {'Content-Type': 'application/json'}
            })
            return await result.json()
        } catch (e) {
            return e as Error
        }
    }

    async getFile(fileId: string) {
        const resp = await this._call('getFile', {
            file_id: fileId
        })
        if (resp instanceof Error) {
            return resp
        } else if (resp.ok) {
            return resp.result as File
        } else {
            return new Error(resp.description)
        }
    }

    async getUserProfilePhotos(userId: number) {
        const result = await this._call('getUserProfilePhotos', {
            user_id: userId,
            offset: 0,
            limit: 1
        })
        if (result instanceof Error) {
            return result
        }
        if (result.ok) {
            return result.result as UserProfilePhotos
        } else {
            return new Error(result.description)
        }
    }

    async getMe(): Promise<User | Error> {
        const result = await this._call('getMe')
        if (result instanceof Error) {
            return <Error>result
        } else {
            if (result.ok) {
                return <User>result.result
            } else {
                return new Error(result.description)
            }
        }
    }

    async setWebhook(url: string, allowedUpdates?: string[]) {
        return await this._call('setWebhook', {
            url: url,
            allowed_updates: allowedUpdates !== undefined ? JSON.stringify(allowedUpdates) : undefined,
        })
    }

    async sendPhoto(chatId: number, photo: string, caption: string, body?: Body) {
        if (!body) {
            body = {}
        }
        body.chat_id = chatId
        body.photo = photo
        body.caption = caption
        const resp = await this._call('sendPhoto', body)
        if (resp instanceof Error) {
            return resp
        } else {
            if (resp.ok) {
                return resp.result as Message
            } else {
                return new Error(resp.description)
            }
        }
    }

    onError(handler: (err: Error) => void): BotAPI {
        this._onError = handler
        return this
    }

    async answerInlineQuery(inlineQueryId: string, results: InlineQueryResult[]) {
        const result = await this._call('answerInlineQuery', {
            inline_query_id: inlineQueryId,
            results: JSON.stringify(results),
            cache_time: 10
        })
        if (result instanceof Error) {
            return result
        } else if (result.ok) {
            return true
        } else {
            console.log(result)
            return new Error(result.description)
        }
    }

    async sendMessage(chatId: number, text: string, params?: Body): Promise<Message | Error> {
        if (params === undefined) {
            params = {}
        }
        params.chat_id = chatId
        params.text = text
        const result = await this._call('sendMessage', params)
        if (result instanceof Error) {
            return ErrServerError
        } else {
            if (result.ok) {
                return result.result as Message
            } else {
                console.log(result)
                return new Error(result.description)
            }
        }
    }

    async deleteMessage(chatId: number, messageId: number) {
        const resp = await this._call('deleteMessage', {
            chat_id: chatId,
            message_id: messageId
        })
        if (resp instanceof Error) {
            return resp
        } else {
            if (resp.ok) {
                return true
            } else {
                return new Error(resp.description)
            }
        }
    }

    async setMyCommands(commands: BotCommand[], lang?: string) {
        if (lang === 'en') {
            lang = undefined
        }
        return await this._call('setMyCommands', {
            commands: JSON.stringify(commands),
            language_code: lang,
        })
    }


    onPreHandle(handler: (update: Update) => boolean) {
        this._preHandleCallback = handler
        return this
    }

    onCommand(command: string, handler: (lang: string, msg: Message) => void): BotAPI {
        command = '/' + command
        if (!this._commands.has(command)) {
            this._commands.set(command, handler)
        }
        return this
    }

    onCommandRegex(regex: RegExp, handler: (lang: string, msg: Message, params: string[]) => void): BotAPI {
        this._commandsRegex.push([regex, handler])
        return this
    }

    onInlineQuery(handler: (query: InlineQuery) => void): BotAPI {
        this._onInlineQuery = handler
        return this
    }
}