import dotenv from 'dotenv'
import {plurals} from "./locale"
import path from "node:path"
dotenv.config({
    path: path.join(__dirname, '../.env'),
})

export const HOSTNAME = process.env.HOSTNAME || ''
if (HOSTNAME === '') {
    console.log('You forgot to specify HOSTNAME in .env file.')
    process.exit(1)
}

export const DB_NAME = 'gift_app_db'
export const DB_USERNAME = process.env.DB_USERNAME || ''
if (DB_USERNAME === '') {
    console.log('You forgot to specify DB_USERNAME in .env file.')
    process.exit(1)
}
export const DB_PASS = process.env.DB_PASSWORD || ''
if (DB_PASS === '') {
    console.log('You forgot to specify DB_PASSWORD in .env file.')
    process.exit(1)
}
export const DB_HOST = 'localhost'
export const DB_PORT = '27017'

export const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID || 0)

export const BOT_API_KEY = process.env.BOT_API_KEY || ''
if (BOT_API_KEY === '') {
    console.log('You forgot to specify BOT_API_KEY in .env file.')
    process.exit(1)
}
export const DEBUG_BOT_API_KEY = process.env.DEBUG_BOT_API_KEY || ''
if (DEBUG_BOT_API_KEY !== '' && ADMIN_TELEGRAM_ID === 0) {
    console.log('You\'ve not set ADMIN_TELEGRAM_ID. Logging through Telegarm Bot won\'t be working.')
}

export const AVAILABLE_LANGUAGES: string[] = (process.env.AVAILABLE_LANGS || '').split(',')
if (AVAILABLE_LANGUAGES.length === 0) {
    console.log('You\'ve not specified any available language.')
    process.exit(1)
}
for (let i = 0; i < AVAILABLE_LANGUAGES.length; i++) {
    if (!Object.keys(plurals).includes(AVAILABLE_LANGUAGES[i])) {
        console.log('You did not write a declension function for numerals in the following language:', AVAILABLE_LANGUAGES[i])
        process.exit(1)
    }
}

export const CRYPTO_PAY_KEY = process.env.CRYPTO_PAY_KEY || ''
if (CRYPTO_PAY_KEY === '') {
    console.log('You forgot to specify CRYPTO_PAY_KEY in .env file.')
    process.exit(1)
}

export const INVOICE_LIFETIME = 120

export const ACTIONS_PER_RESULT = 50