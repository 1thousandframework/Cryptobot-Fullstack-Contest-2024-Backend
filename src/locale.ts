import {AVAILABLE_LANGUAGES} from "./config"
import fs from "node:fs"
import {logError} from "./logs"
import path from "node:path"
import {bot} from "./core";

// plurals record contains functions responsible for choosing
// the correct declension for the specified number.
//
// Functions' algorithms are based on
// this page: https://docs.translatehouse.org/projects/localization-guide/en/latest/l10n/pluralforms.html
export const plurals: Record<string, (n: number) => number> = {
    'en': (n: number) => {
        return n === 1 ? 0 : 1
    },
    'ru': (n: number) => {
        if (n % 10 === 1 && n % 100 !== 11) {
            return 0
        } else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
            return 1
        } else {
            return 2
        }
    }
}

// This variable contains all available locales loaded from ./locales/lang.json.
const locales = new Map<string, Map<string, string>>()

// Language inheritance for CIS region.
const langRuInheritance = new Set([
    'uk', 'be',
    'ka', 'hy', 'az',
    'kk', 'ky', 'uz', 'tg', 'tk'
])

// Normalizes language code to read proper Map from locales variable.
function normalizeLang(lang: string): string {
    lang = lang.toLowerCase()
    if (lang === 'ru' || langRuInheritance.has(lang)) {
        return 'ru'
    } else {
        return 'en'
    }
}

// lc gets translation for specified language and specified key.
export function lc(lang: string, key: string): string {
    lang = normalizeLang(lang)
    return locales.get(lang)?.get(key) || key
}

// Returns
export function lcP(lang: string, key: string, quantity: number): string {
    const variants = lc(lang, key).split(' ')
    return variants[plurals[lang](quantity)] || ''
}

export async function initLocales() {
    for (let i = 0; i < AVAILABLE_LANGUAGES.length; i++) {
        const lang = AVAILABLE_LANGUAGES[i]
        try {
            const data = fs.readFileSync(path.join(__dirname, '/../locales/') + lang + '.json', 'utf-8')
            const unmarshalledData = JSON.parse(data)
            locales.set(lang, new Map<string, string>())
            for (const key in unmarshalledData) {
                locales.get(lang)!.set(key, unmarshalledData[key])
            }
        } catch (err) {
            await logError(err)
            console.log('Error while initializing locales.')
            process.exit(1)
        }
    }
}