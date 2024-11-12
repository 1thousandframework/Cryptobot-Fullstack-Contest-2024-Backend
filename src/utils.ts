import fs from "node:fs";
import {HOSTNAME} from "./config";
import {User} from "./types";

// isObject checks is value an object.
export function isObject(value: any): value is Object {
    return typeof value === 'object' && value !== null;
}

// createDirIfNotExists creates a directory in a working directory if it does not exist.
export function createDirIfNotExists(folderName: string) {
    const cwd = process.cwd()
    if (!fs.existsSync(cwd + folderName)) {
        fs.mkdirSync(cwd + folderName, { recursive: true })
        console.log('Directory created:', folderName)
    }
}

// filenameByTimestamp generates a filename by current time.
export function filenameByTimestamp(prefix: string, extension: string): string {
    const curDate = new Date()
    const dateString = [
        curDate.getFullYear(),
        String(curDate.getMonth() + 1).padStart(2, '0'),
        String(curDate.getDate()).padStart(2, '0')
    ].join('-') + '_' + [
        String(curDate.getHours()).padStart(2, '0'),
        String(curDate.getMinutes()).padStart(2, '0'),
        String(curDate.getSeconds()).padStart(2, '0')
    ].join('-')
    return prefix + '_' + dateString + '.' + extension
}

// f formats string with parameters in it.
export function f(template: string, ...args: (number | string)[]): string {
    return template.replace(/{(\d+)}/g, (match, index) => {
        return typeof args[index] !== 'undefined' ? String(args[index]) : match;
    });
}

// giftPreviewByAliasName returns gift preview by its alias.
export function giftPreviewByAliasName(aliasName: string): string {
    return 'https://' + HOSTNAME + '/img/gift-' + aliasName + '-preview.png'
}

export async function downloadFileTo(url: string, dest: string) {
    const resp = await fetch(url)
    if (resp.ok) {
        const data = await resp.blob();
        const buff = Buffer.from(await data.arrayBuffer())
        fs.writeFile(dest, buff, {encoding: 'binary'}, () => {})
    }
    return null
}

// htmlBold wraps a string in to HTML tag <b>.
export function htmlBold(str: string): string {
    return '<b>' + escapeHTML(str) + '</b>'
}

// escapeHTML escapes HTML characters to insert it in HTML tag safely.
function escapeHTML(str: string): string {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

// base64ToHex converts base64 string to hex string.
export function base64ToHex(base64: string) {
    const binaryString = atob(base64);
    let hexString = '';
    for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16);
        hexString += hex.padStart(2, '0');
    }
    return hexString;
}

export function fullName(firstName: string, lastName?: string): string {
    let userFullName = firstName
    if (lastName) {
        userFullName += ' ' + lastName
    }
    return userFullName
}