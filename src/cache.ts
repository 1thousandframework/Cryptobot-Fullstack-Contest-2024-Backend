import {Gift, GiftId, User} from "./types";
import {InvoiceId} from "./CryptoPay";

export namespace Cache {
    export const purchasedCount = new Map<GiftId, {value: number}>()

    export const supply = new Map<GiftId, number>()

    export const activeInvoices = new Map<GiftId, Set<InvoiceId>>()

    export const users = new Map<number, User>()

    export const gifts = new Map<string, Gift>()

    export const availability = new Map<string, number>
}
