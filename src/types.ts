import {Document, WithId} from "mongodb";
import {Key} from "./helpers/database.helper";
import {InvoiceId} from "./CryptoPay";

export interface PaymentUrlData {
    invoice_id: InvoiceId
    mini_app_url: string
    bot_url: string
}

export interface Action {
    _id: string
    gift_id: GiftId
    actor_telegram_id: number
    target_action_id?: string
    action_type: number
    gift?: Gift
    user?: User
    target_user?: User
    target_action?: Action
    insert_date: Date
    created_at?: number
}

// NewAction unmarshalls database row in to Action struct.
export function NewAction(row: WithId<Document>): Action {
    return {
        gift_id: row[Key.gift_id].toString(),
        actor_telegram_id: row[Key.actor_telegram_id],
        target_action_id: row[Key.target_action_id] ? row[Key.target_action_id].toString() : undefined,
        action_type: row[Key.action_type],
        created_at: row._id.getTimestamp().getTime() / 1000,
        insert_date: row[Key.insert_date],
        _id: row._id.toString(),
    }
}

export interface Gift {
    _id?: GiftId
    name: string
    price: number
    asset: string
    supply: number
    play_algo: string
    purchased_count: number
    created_at?: number
    color: string
    animation: string
    availability?: number
}

// NewGift unmarshalls database row in to Gift struct.
export function NewGift(row: WithId<Document>): Gift {
    return {
        name: row[Key.name],
        price: row[Key.price],
        asset: row[Key.asset],
        supply: row[Key.supply],
        play_algo: row[Key.play_algo],
        purchased_count: row[Key.purchased_count] || 0,
        animation: row[Key.animation],
        color: row[Key.color],
        created_at: row._id.getTimestamp().getTime() / 1000,
        _id: row._id.toString(),
    }
}

export interface User {
    _id?: string
    telegram_id: number
    first_name: string
    last_name?: string
    is_premium: boolean
    avatar_url?: string
    received_count: number
}

// NewUser unmarshalls database row in to User struct.
export function NewUser(row: WithId<Document>): User {
    return {
        telegram_id: row[Key.telegram_id],
        received_count: row[Key.received_count],
        first_name: row[Key.first_name],
        last_name: row[Key.last_name],
        is_premium: row[Key.is_premium] || false,
        avatar_url: row[Key.avatar_url],
        _id: row._id.toString(),
    }
}

export type GiftId = string
export type ObjectIdHex = string
export type ActionType = number