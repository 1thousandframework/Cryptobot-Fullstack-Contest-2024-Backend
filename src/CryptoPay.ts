import {FastifyReply, FastifyRequest} from "fastify";
import {bot, cryptoPay, db} from "./core";
import {GiftId} from "./types";
import DatabaseHelper from "./helpers/database.helper";
import {lc} from "./locale";
import {f} from "./utils";
import {NewInlineKeyboardMarshalled, NewWebAppButton} from "./BotAPI";
import {Cache} from "./cache";
import {logError} from "./logs";
import {MongoError} from "mongodb";

interface CryptoPayBody {
    invoice_id?: InvoiceId
    amount?: string
    asset?: string
    description?: string
    hidden_message?: string
    paid_btn_name?: string
    paid_btn_url?: string
    payload?: string
    expired_in?: number
}

interface CryptoPayResponse {
    ok: boolean
    result: unknown
}

export interface CryptoPayInvoice {
    invoice_id: InvoiceId
    hash: string
    bot_invoice_url: string
    mini_app_invoice_url: string
    payload?: string
}

export interface CryptoPayUpdate {
    update_id: number
    update_type: string
    request_date: string
    payload: CryptoPayInvoice
}

export type InvoiceId = number

// cryptoPayWebhookHandler handles webhooks about paid invoices.
export async function cryptoPayWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
    const update = request.body as CryptoPayUpdate
    if (update.update_type === 'invoice_paid') {
        const isProcessed = await DatabaseHelper.checkInvoiceMarkedAsProcessed(update.payload.invoice_id)
        if (isProcessed instanceof Error) {
            logError(isProcessed)
            reply.status(500).send()
            return
        }
        if (isProcessed === null) {
            const client = db.getClient()
            const session = client.startSession()
            try {
                await session.withTransaction(async () => {
                    const invoicePayload = update.payload.payload!.split(' ')
                    const giftId = invoicePayload[0] as GiftId
                    const userId = Number(invoicePayload[1])
                    const lang = invoicePayload[2]

                    // Add a gift to the user's gift list.
                    const result = await DatabaseHelper.addPurchase(userId, giftId)
                    if (result === null) {
                        throw new Error('purchase not added')
                    }
                    // Increment purchased count.
                    const updateResult = await DatabaseHelper.incrementPurchasedCount(giftId)
                    if (updateResult instanceof Error) {
                        logError(updateResult)
                        throw updateResult
                    }

                    // Save invoice to the list of paid.
                    const insertResult = await DatabaseHelper.saveInvoice(update.payload.invoice_id, result.insertedId.toString())
                    if (insertResult instanceof Error) {
                        logError(insertResult)
                        throw insertResult
                    }

                    // Notify buyer.
                    const gift = await DatabaseHelper.getGift(giftId)
                    if (gift !== null && !(gift instanceof Error)) {
                        // Send a message to the purchaser about the gift was purchased.
                        bot.sendMessage(userId, f('✅ ' + lc(lang, 'gift_buy_congrats'), '<b>' + gift.name + '</b>'), {
                            parse_mode: 'HTML',
                            reply_markup: NewInlineKeyboardMarshalled([NewWebAppButton(lc(lang, 'open_gifts'), 'gifts')])
                        })
                    }

                    // Updating cache.
                    const purchasedCount = (Cache.purchasedCount.get(giftId)!.value++) + 1
                    if (purchasedCount === Cache.supply.get(giftId)) { // if all gifts were sold...
                        const activeInvoices = Cache.activeInvoices.get(giftId) // ...get active invoices for this gift...
                        Cache.activeInvoices.delete(giftId) // ...clear set...
                        for (const invoiceId of activeInvoices!) { // ...and delete the active invoices.
                            await cryptoPay.deleteInvoice({
                                invoice_id: invoiceId,
                            })
                        }
                    }
                })
            } catch (e) {
                logError(e as MongoError)
                reply.status(500).send()
                return
            } finally {
                const result = await session.endSession()
                console.log(result)
                console.log('Transaction successfully processed')
            }
        }
    }
    reply.code(200).send('Ok')
}

export default class CryptoPay {
    constructor(private readonly _token: string) {}

    private async _call(method: string, data: CryptoPayBody): Promise<CryptoPayResponse | Error> {
        try {
            const result = await fetch('https://testnet-pay.crypt.bot/api/' + method, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Crypto-Pay-API-Token': this._token,
                },
                body: JSON.stringify(data),
            })
            return result.json()
        } catch (e) {
            return e as Error
        }
    }

    deleteInvoice(params: CryptoPayBody) {
        return this._call('deleteInvoice', params)
    }

    createInvoice(params: CryptoPayBody) {
        return this._call('createInvoice', params)
    }
}