import {Action, ActionType, Gift, GiftId, NewAction, NewGift, NewUser, ObjectIdHex, User} from "../types";
import {Document, MongoError, ObjectId, WithId} from "mongodb";
import {ErrCantGetSchemeId} from "../errors";
import {bot, db} from "../core";
import {logError, logToTelegram} from "../logs";
import {InvoiceId} from "../CryptoPay";
import {Cache} from "../cache";
import {ACTIONS_PER_RESULT, AVAILABLE_LANGUAGES, BOT_API_KEY, HOSTNAME} from "../config";
import {BotCommand} from "../BotAPI";
import {lc} from "../locale";
import {downloadFileTo} from "../utils";
import {Database} from "../Database";

// Collection contains all possible collection names in database.
export const Collection = {
    scheme: 'scheme',
    gifts: 'gifts',
    users: 'users',
    actions: 'actions',
    invoices: 'invoices',
}

// Key contains all possible keys for fields in database.
export const Key = {
    schemeId: 'schemeId',
    name: 'name',
    price: 'price',
    supply: 'supply',
    asset: 'asset',
    animation: 'animation',
    purchased_count: 'purchased_count',
    color: 'color',
    telegram_id: 'telegram_id',
    menu_msg_id: 'menu_msg_id',
    gift_id: 'gift_id',
    action_type: 'action_type',
    actor_telegram_id: 'actor_telegram_id',
    target_action_id: 'target_action_id',
    first_name: 'first_name',
    last_name: 'last_name',
    is_premium: 'is_premium',
    avatar_url: 'avatar_url',
    received_count: 'received_count',
    invoice_id: 'invoice_id',
    purchase_action_id: 'purchase_action_id',
    play_algo: 'play_alog',
    insert_date: 'insert_date',
}

// Keys contains array of keys that are related for specific collection,
// so you can use it in any select queries.
export const Keys = {
    gifts: [Key.name, Key.price, Key.supply, Key.asset, Key.color, Key.animation, Key.purchased_count, Key.play_algo],
    users: [Key.telegram_id, Key.first_name, Key.last_name, Key.is_premium, Key.avatar_url, Key.received_count],
    actions: [Key.gift_id, Key.action_type, Key.target_action_id, Key.actor_telegram_id, Key.insert_date]
}

// schemeId stores database scheme id.
let schemeId: number = 1

// migrate performs database migration from current version (stored in database) to target version.
export async function migrate(targetSchemeId: number): Promise<boolean | Error> {
    if (!await db.collectionExists(Collection.scheme)) {
        await db.createCollection(Collection.scheme, true)
        await db.insert(Collection.scheme, {[Key.schemeId]: schemeId})
    } else {
        let data = await db.selectCell(Collection.scheme, Key.schemeId)
        if (data instanceof Error) {
            logError(data)
            console.log('Can\'t load scheme.')
            process.exit(1)
        } else if (data !== null) {
            schemeId = data as number
        } else {
            return ErrCantGetSchemeId
        }
    }
    const fromSchemeId = schemeId
    if (targetSchemeId < schemeId) {
        targetSchemeId = schemeId
    }
    while (schemeId < targetSchemeId) {
        if (schemeId === 1) {
            const gifts: Array<Gift> = [
                {
                    name: 'Delicious Cake',
                    price: 10,
                    asset: 'USDT',
                    supply: 10000,
                    color: '#FE9F41',
                    animation: 'delicious-cake',
                    purchased_count: 0,
                    play_algo: 'play'
                },
                {
                    name: 'Green Star',
                    price: 0.01,
                    asset: 'ETH',
                    supply: 5000,
                    color: '#46D100',
                    animation: 'green-star',
                    purchased_count: 0,
                    play_algo: 'reverseplay play'
                },
                {
                    name: 'Blue Star',
                    price: 5,
                    asset: 'TON',
                    supply: 3000,
                    color: '#007AFF',
                    animation: 'blue-star',
                    purchased_count: 0,
                    play_algo: 'reverseplay play'
                },
                {
                    name: 'Red Star',
                    price: 5,
                    asset: 'USDT',
                    supply: 3,
                    color: '#FF4747',
                    animation: 'red-star',
                    purchased_count: 0,
                    play_algo: 'reverseplay play'
                }
            ]
            for (const gift of gifts) {
                await db.insert(Collection.gifts, {
                    [Key.name]: gift.name,
                    [Key.price]: gift.price,
                    [Key.asset]: gift.asset,
                    [Key.supply]: gift.supply,
                    [Key.color]: gift.color,
                    [Key.play_algo]: gift.play_algo,
                    [Key.animation]: gift.animation,
                    [Key.purchased_count]: 0
                })
            }
        } else if (schemeId === 2) {
            // await db.createIndex(Collection.actions, { _id: -1 });
            await db.createIndex(Collection.users, { [Key.telegram_id]: 1 }, { unique: true });
            await db.createIndex(Collection.invoices, { [Key.invoice_id]: 1 }, { unique: true })
            await db.createIndex(Collection.actions, { [Key.target_action_id]: 1 }, { unique: true, sparse: true })
        } else if (schemeId === 3) {
            const result = await bot.setWebhook('https://' + HOSTNAME + '/webhooks/' + BOT_API_KEY)
            if (!(result instanceof Error)) {
                if (result.ok) {
                    console.log('Webhook was set.')
                }
            }
        } else if (schemeId === 7) {
            for (const lang of AVAILABLE_LANGUAGES) {
                const commands: BotCommand[] = []
                for (const commandStr of lc(lang, 'commands').split('\n')) {
                    const command = [
                        commandStr.substring(0, commandStr.indexOf(' ')),
                        commandStr.substring(commandStr.indexOf(' ') + 1)
                    ]
                    commands.push({
                        command: command[0],
                        description: command[1],
                    })
                }
                const result = await bot.setMyCommands(commands, lang)
                if (result instanceof Error) {
                    logError(result)
                } else {
                    if (result?.ok) {
                        console.log('Commands were set:', lang)
                    } else {
                        console.log(result)
                    }
                }
            }
        } else if (schemeId === 8) {
            await db.createIndex(Collection.users, { [Key.received_count]: -1 });
        }
        schemeId++
    }
    if (schemeId !== fromSchemeId) {
        console.log('Migration', fromSchemeId, ' -> ', schemeId)
        await db.updateCell(Collection.scheme, Key.schemeId, schemeId)
    }
    console.log('Scheme id:', schemeId)
    return true
}

export const ACTION_TYPE_PURCHASE: ActionType = 1
export const ACTION_TYPE_SEND: ActionType = 2
export const ACTION_TYPE_RECEIVE: ActionType = 3

// DatabaseHelpers is a wrapper over Database instance,
// and it helps to work with app's data instances.
export default class DatabaseHelper {
    static async insertAction(giftId: string, actionTypeId: ActionType, actorTelegramId: number, targetActionId?: string) {
        const doc = {
            [Key.gift_id]: new ObjectId(giftId),
            [Key.action_type]: actionTypeId,
            [Key.actor_telegram_id]: actorTelegramId,
            [Key.insert_date]: new Date()
        }
        if (targetActionId) {
            doc[Key.target_action_id] = new ObjectId(targetActionId)
        }
        const result = await db.insertOne(Collection.actions, doc)
        if (result instanceof Error) {
            logError(result)
            return null
        }
        return result
    }

    static async addPurchase(buyerTelegramId: number, giftId: string) {
        return this.insertAction(giftId, ACTION_TYPE_PURCHASE, buyerTelegramId)
    }

    static async addReceive(receiverTelegramId: number, buyerTelegramId: number, giftId: string, purchaseActionId: string) {
        const client = db.getClient()
        const session = client.startSession()
        let noError = true;
        try {
            await session.withTransaction(async () => {
                const insertReceive = await this.insertAction(
                    giftId, ACTION_TYPE_RECEIVE,
                    receiverTelegramId, purchaseActionId)
                if (insertReceive != null) {
                    const result = await this.insertAction(
                        giftId, ACTION_TYPE_SEND,
                        buyerTelegramId, insertReceive.insertedId.toString()
                    )
                    if (result !== null) {
                        const upd = await db.updateCell(Collection.actions, Key.target_action_id, result!.insertedId.toString(), {
                            _id: new ObjectId(purchaseActionId)
                        })
                        if (upd instanceof Error) {
                            logError(upd)
                            throw 'purchase action is NOT updated'
                        } else {
                            await this.incrementReceivedCount(receiverTelegramId)
                        }
                    } else {
                        throw 'send is NOT inserted'
                    }
                } else {
                    throw 'receive is NOT inserted'
                }
            })
        } catch (e) {
            noError = false
            logError(e as MongoError)
        } finally {
            await session.endSession()
        }
        return noError
    }

    // incrementReceivedCount increments received gifts counter for a user.
    static async incrementReceivedCount(telegramId: number) {
        const cachedUser = Cache.users.get(telegramId)
        if (cachedUser) {
            cachedUser.received_count++
        }
        await db.incrementValue(Collection.users, Key.received_count, {
            [Key.telegram_id]: telegramId
        })
    }

    // checkInvoiceMarkedAsProcessed checks invoice marked as processed. (paid)
    static async checkInvoiceMarkedAsProcessed(invoiceId: InvoiceId) {
        const result = await db.selectCell(Collection.invoices, Key.purchase_action_id, {[Key.invoice_id]: invoiceId})
        if (result instanceof Error) {
            return result
        }
        return result
    }

    static async saveInvoice(invoiceId: InvoiceId, purchaseActionId: ObjectIdHex) {
        try {
            return await db.insert(Collection.invoices, {
                [Key.invoice_id]: invoiceId,
                [Key.purchase_action_id]: new ObjectId(purchaseActionId)
            }, true)
        } catch (e) {
            return e as Error
        }
    }

    static async incrementPurchasedCount(giftId: string) {
        const result = await db.incrementValue(Collection.gifts, Key.purchased_count, {_id: new ObjectId(giftId)})
        if (result instanceof Error) {
            logError(result)
            return result
        } else {
            if (result.modifiedCount > 0) {
                const cachedGift = Cache.gifts.get(giftId)
                if (cachedGift) {
                    cachedGift.purchased_count++
                }
            }
            return result.modifiedCount > 0
        }
    }

    // getMenuMsgId returns user's menu message id.
    static async getMenuMsgId(telegramId: number): Promise<number | Error> {
        const result = await db.selectCell(Collection.users, Key.menu_msg_id, {[Key.telegram_id]: telegramId})
        if (result instanceof Error) {
            return result;
        } else if (result !== null) {
            return result as number
        } else {
            return 0;
        }
    }

    // setMenuMsgId updates menu message id.
    static async setMenuMsgId(telegramId: number, newMenuMsgId: number) {
        db.updateCell(Collection.users, Key.menu_msg_id, newMenuMsgId, {[Key.telegram_id]: telegramId})
    }

    static async getUser(telegramId: number): Promise<User | null | Error> {
        if (Cache.users.has(telegramId)) {
            return Cache.users.get(telegramId)!
        } else {
            const rawUser = await db.selectRow(Collection.users, Keys.users, {[Key.telegram_id]: telegramId})
            if (rawUser instanceof Error) {
                return rawUser
            } else {
                if (rawUser === null) {
                    return null
                } else {
                    const user = NewUser(rawUser)
                    Cache.users.set(telegramId, user)
                    return user
                }
            }
        }
    }

    static async getUserPlace(telegramId: number): Promise<number> {
        const user = await DatabaseHelper.getUser(telegramId) as User
        if (user instanceof Error) {
            logError(user)
            return 0
        }
        if (user !== null) {
            return await db.count(Collection.users, {
                [Key.received_count]: {$gt: user.received_count}
            }) + 1
        } else {
            return 0
        }
    }

    static async updateUserPhoto(telegramId: number, actualFileId?: string) {
        const result = await bot.getUserProfilePhotos(telegramId)
        if (result instanceof Error) {

        } else {
            if (result.total_count > 0) {
                const photo = result.photos[0][result.photos[0].length - 1]
                if (actualFileId !== photo.file_unique_id) {
                    const file = await bot.getFile(photo.file_id)
                    if (file instanceof Error) {
                        logError(file)
                    } else {
                        const filename = '/avatars/' + photo.file_unique_id + '.jpeg'
                        downloadFileTo('https://api.telegram.org/file/bot' + bot.token + '/' + file.file_path, process.cwd() + filename)
                        const avatarUrl = 'https://' + HOSTNAME + filename
                        const updateResult = await db.updateCell(Collection.users, Key.avatar_url, avatarUrl, {[Key.telegram_id]: telegramId})
                        if (!(updateResult instanceof Error) && updateResult.modifiedCount > 0) {
                            const cachedUser = Cache.users.get(telegramId)
                            if (cachedUser) {
                                cachedUser.avatar_url = avatarUrl
                            }
                        }
                    }
                }
            }
        }
    }

    // addUserIfNotExists adds user to database if it does NOT exist or updates its info.
    static async addUserIfNotExists(telegramId: number, firstName: string, lastName: string | undefined, isPremium?: boolean) {
        const user = await this.getUser(telegramId)
        if (user instanceof Error) {
            logError(user)
        } else if (user === null) {
            try {
                const result = await db.insertOne(Collection.users, {
                    [Key.telegram_id]: telegramId,
                    [Key.menu_msg_id]: 0,
                    [Key.is_premium]: isPremium,
                    [Key.first_name]: firstName,
                    [Key.last_name]: lastName,
                    [Key.received_count]: 0,
                    [Key.menu_msg_id]: 0
                })
                DatabaseHelper.updateUserPhoto(telegramId)
                return result
            } catch (e) {
                logError(e)
            }
        } else {
            (async function() {
                const doc: Document = {}
                if (user.first_name !== firstName) {
                    doc[Key.first_name] = firstName
                }
                if (user.last_name !== lastName) {
                    doc[Key.last_name] = lastName
                }
                if (isPremium !== undefined && user.is_premium !== isPremium) {
                    doc[Key.is_premium] = isPremium
                }
                const update = await db.updateOne(Collection.users, doc, {
                    [Key.telegram_id]: telegramId,
                })
                if (update instanceof Error) {
                    logError(update)
                } else {
                    if (update.modifiedCount > 0) {
                        const cachedUser = Cache.users.get(telegramId)
                        if (cachedUser) {
                            cachedUser.first_name = firstName
                            cachedUser.last_name = lastName
                            if (isPremium !== undefined) {
                                cachedUser.is_premium = isPremium
                            }
                        }
                    }
                }
                let actualFileId: string | undefined
                if (user.avatar_url) {
                    const temp = user.avatar_url!.split('/')
                    actualFileId = temp[temp.length - 1].split('.')[0]
                }
                DatabaseHelper.updateUserPhoto(telegramId, actualFileId)
            })().then(() => {})
        }
    }

    static async getReceivedGifts(telegramId: number, offset: number) {
        const rawActions = await db.select(Collection.actions, Keys.actions, {
            [Key.actor_telegram_id]: telegramId,
            [Key.action_type]: ACTION_TYPE_RECEIVE,
        }, [offset, ACTIONS_PER_RESULT], {_id: -1})
        if (rawActions instanceof Error) {
            logError(rawActions)
            return null
        } else {
            return rawActions.map((rawAction): Action => NewAction(rawAction));
        }
    }

    static async getLeaders(offset: number) {
        const result = await db.select(Collection.users, Keys.users, {
            [Key.received_count]: { $ne: 0 },
        }, [offset, ACTIONS_PER_RESULT], {[Key.received_count]: -1})
        if (result instanceof Error) {
            return result
        }
        return result.map((user): User => NewUser(user));
    }

    static async getGiftAvailability(purchaseActionId: string) {
        if (Cache.availability.has(purchaseActionId)) {
            return Cache.availability.get(purchaseActionId)!
        } else {
            const action = await DatabaseHelper.getAction(purchaseActionId) as Action
            console.log(action.insert_date)
            const result = await db.count(Collection.actions, {
                // [Key.action_type]: ACTION_TYPE_SEND,
                // [Key.gift_id]: new ObjectId(action.gift_id),
                // // _id: {$lt: new ObjectId(action._id)},
                // [Key.insert_date]: {$lt: action.insert_date},
                $and: [
                    // {[Key.insert_date]: {$lt: action.insert_date}},
                    {[Key.action_type]: {$eq: ACTION_TYPE_SEND}},
                    {[Key.gift_id]: {$eq: new ObjectId(action.gift_id)}}
                ]
            }) + 1
            console.log(result)
            Cache.availability.set(purchaseActionId, result)
            return result
        }
    }

    static async getGifts(skip: number = 0, limit: number = 10): Promise<Gift[] | null> {
        const rawGifts = await db.select(Collection.gifts, Keys.gifts, {}, [skip, limit]);
        if (rawGifts instanceof Error) {
            return null
        } else {
            return rawGifts.map((gift): Gift => NewGift(gift));
        }
    }

    static async getPaidInvoices(): Promise<InvoiceId[] | Error> {
        const rawInvoices = await db.select(Collection.invoices, [Key.invoice_id], {});
        if (rawInvoices instanceof Error) {
            return rawInvoices
        } else {
            return rawInvoices.map((row): InvoiceId => row[Key.invoice_id]);
        }
    }

    static async getGift(id: GiftId): Promise<Gift | null | Error> {
        const cachedGift = Cache.gifts.get(id)
        if (cachedGift) {
            return cachedGift
        } else {
            const rawGift = await db.selectRow(Collection.gifts, Keys.gifts, {_id: new ObjectId(id)});
            if (rawGift instanceof Error) {
                return rawGift
            } else {
                if (rawGift !== null) {
                    const gift = NewGift(rawGift)
                    Cache.gifts.set(id, gift)
                    return gift
                } else {
                    return null
                }
            }
        }
    }

    static async getAction(actionId: string): Promise<Action | null | Error> {
        const rawAction = await db.selectRow(Collection.actions, Keys.actions, {_id: new ObjectId(actionId)});
        if (rawAction instanceof Error) {
            return rawAction
        } else {
            return rawAction === null ? null : NewAction(rawAction);
        }
    }

    static async getGiftActions(giftId: string, offset: number): Promise<Action[] | Error> {
        const rawActions = await db.select(Collection.actions, Keys.actions, {
            [Key.gift_id]: new ObjectId(giftId),
            [Key.action_type]: { $ne: ACTION_TYPE_RECEIVE }
        }, [offset, ACTIONS_PER_RESULT], {_id: -1});
        if (rawActions instanceof Error) {
            return rawActions
        } else {
            return rawActions.map((rawAction): Action => NewAction(rawAction));
        }
    }

    static async getUnsentGifts(telegramId: number, offset: number): Promise<Error | Action[]> {
        const rawActions = await db.select(Collection.actions, Keys.actions, {
            [Key.action_type]: ACTION_TYPE_PURCHASE,
            [Key.actor_telegram_id]: telegramId,
            [Key.target_action_id]: { $exists: false }
        }, [offset, ACTIONS_PER_RESULT], {_id: -1})
        if (rawActions instanceof Error) {
            return rawActions
        } else {
            return rawActions.map((rawAction): Action => NewAction(rawAction));
        }
    }

    static async getUserActions(telegramId: number, offset: number) {
        const rawActions = await db.select(Collection.actions, Keys.actions, {
            [Key.actor_telegram_id]: telegramId,
        }, [offset, ACTIONS_PER_RESULT], {_id: -1})
        if (rawActions instanceof Error) {
            return rawActions
        } else {
            return rawActions.map((rawAction): Action => NewAction(rawAction));
        }
    }
}