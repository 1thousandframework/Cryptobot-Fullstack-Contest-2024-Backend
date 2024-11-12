
export const SIGHUP: number = 1
export const SIGINT = 2
export const SIGQUIT = 3
export const SIGTERM = 15

const sigNames: Record<number, string> = {
    [SIGHUP]: 'SIGHUP',
    [SIGINT]: 'SIGINT',
    [SIGQUIT]: 'SIGQUIT',
    [SIGTERM]: 'SIGTERM',
}

export function handleSignal(signal: number) {
    console.log('Received ' + sigNames[signal] + '. Exiting...')
    process.exit()
}

export function initSignalHandlers() {
    process.on('SIGHUP', () => handleSignal(SIGHUP))
    process.on('SIGINT', () => handleSignal(SIGINT))
    process.on('SIGQUIT', () => handleSignal(SIGQUIT))
    process.on('SIGTERM', () => handleSignal(SIGTERM))
}