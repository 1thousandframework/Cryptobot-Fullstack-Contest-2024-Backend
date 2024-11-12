import fs from "node:fs"
import {ADMIN_TELEGRAM_ID} from "./config"
import {filenameByTimestamp} from "./utils";
import {loggerBot} from "./core";

export async function logError(data: any) {
    fs.writeFileSync(
        process.cwd() + '/logs/' + filenameByTimestamp('error_log', 'txt'),
        data.stack + '\n\n' + JSON.stringify(data),
        {encoding: "utf8"}
    )
    await logToTelegram(data.stack + '\n\n' + data.toString())
}

export async function logToTelegram(data: any) {
    if (loggerBot !== undefined && ADMIN_TELEGRAM_ID !== 0) {
        await loggerBot.sendMessage(ADMIN_TELEGRAM_ID, data)
    }
}