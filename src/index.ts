import {initRoutes} from "./routes"
import {initSignalHandlers} from "./signals"
import {initLocales} from "./locale"
import {migrate} from "./helpers/database.helper";
import {initCache, initCryptoPay, initDatabase, initDirectories, initTelegramBots, initWebserver} from "./core";

async function runApp() {
    initSignalHandlers()
    initDirectories()
    await initTelegramBots() // Telegram commands handlers are here.
    initCryptoPay()
    await initLocales()
    initRoutes()
    await initDatabase()
    await migrate(9)
    await initCache()
    await initWebserver()
}

runApp()