import {FastifyReply} from "fastify";
import {InvoiceId} from "../CryptoPay";
import {createHmac} from "node:crypto";
import {bot} from "../core";

export const apiErrJsonExpected = 'json_expected'
export const apiErrUserDataRequired = 'user_data_required'
export const apiErrAuthFailed = 'auth_failed'
export const apiErrServerError = 'server_error'
export const apiErrNotFound = 'not_found'
export const apiErrCantCreateInvoice = 'cant_create_invoice'
export const apiErrOutOfGift = 'out_of_gift'
export const apiErrAlreadyActivated = 'already_activated'

export interface APIRequest {
    user_data?: string
    id?: string
    lang?: string
    invoice_id?: InvoiceId
    telegram_id?: number
    gift_id?: string
    action_id?: string
    offset?: number
}

export interface APIUser {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
    allows_write_to_pm: boolean
}

// apiReplyErr sends to client ok false with specified error.
export function apiReplyErr(reply: FastifyReply, errName: string): void {
    reply.code(200).header('Content-Type', 'application/json charset=utf-8').send({
        ok: false,
        error_description: errName
    })
}

// apiReplyErr sends to client ok true with specified data.
export function apiReplyOk(reply: FastifyReply, data: any): void {
    reply.code(200).header('Content-Type', 'application/json charset=utf-8').send({
        ok: true,
        data: data
    })
}

// checkUserDataValidity checks is data received from client are authentic.
export function checkUserDataValidity(userData: string): APIUser | undefined {
    const urlParams = new URLSearchParams(userData)
    let hash!: string
    let userStr!: string
    let queryId: string
    let strings: string[] = []
    for (const [key, value] of urlParams.entries()) {
        if (key === 'hash') {
            hash = value || ''
            continue
        } else if (key === 'user') {
            userStr = value || ''
        } else if (key === 'query_id') {
            queryId = value || ''
        }
        strings.push(key+'='+value)
    }
    strings.sort()
    const imploded = strings.join('\n')
    const hmac = createHmac('sha256', 'WebAppData').update(bot.token).digest()
    const hmacHashHex = createHmac('sha256', hmac).update(imploded).digest('hex')
    if (hmacHashHex === hash) {
        return JSON.parse(userStr) as APIUser
    } else {
        return undefined
    }
}