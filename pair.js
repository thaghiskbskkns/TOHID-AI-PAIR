import express from 'express';
import fs from 'fs-extra';
import { exec } from 'child_process';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { upload } from './mega.js';
import {
    default as makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} from '@whiskeysockets/baileys';

const router = express.Router();

const MESSAGE = process.env.MESSAGE || `
*SESSION GENERATED SUCCESSFULLY* ✅

*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟
https://github.com/AmonTech1/NOVA-MD

*WʜᴀᴛsAᴘᴘ Cʜᴀɴɴᴇʟ* 🌟
https://whatsapp.com/channel/0029VbBaJvI7IUYbtCeaPh0I

*Gɪᴛʜᴜʙ* 🌟
https://github.com/AmonTech1

*NOVA-MD--WHATSAPP-BOT* 🥀
`;

// Ensure the directory is empty when the app starts
if (fs.existsSync('./auth_info_baileys')) {
    await fs.emptyDir('./auth_info_baileys');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        await delay(10000);
                        if (fs.existsSync('./auth_info_baileys/creds.json'));

                        const auth_path = './auth_info_baileys/';
                        let user = sock.user.id;

                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                        const Id_session = mega_url.replace('https://mega.nz/file/', '');

                        const Scan_Id = Id_session;

                        let msgsss = await sock.sendMessage(user, { text: Scan_Id });
                        await sock.sendMessage(user, { text: MESSAGE }, { quoted: msgsss });
                        await delay(1000);
                        try { await fs.emptyDir('./auth_info_baileys'); } catch (e) {}

                    } catch (e) {
                        console.log("Error during file upload or message send: ", e);
                    }

                    await delay(100);
                    await fs.emptyDir('./auth_info_baileys');
                }

                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    if (reason === DisconnectReason.connectionClosed) {
                        console.log("Connection closed!");
                    } else if (reason === DisconnectReason.connectionLost) {
                        console.log("Connection Lost from Server!");
                    } else if (reason === DisconnectReason.restartRequired) {
                        console.log("Restart Required, Restarting...");
                        initiateSession().catch(err => console.log(err));
                    } else if (reason === DisconnectReason.timedOut) {
                        console.log("Connection TimedOut!");
                    } else {
                        console.log('Connection closed with bot. Please run again.');
                        console.log(reason);
                        await delay(5000);
                        exec('pm2 restart nova');
                    }
                }
            });

        } catch (err) {
            console.log("Error in initiateSession function: ", err);
            exec('pm2 restart nova');
            console.log("Service restarted due to error");
            initiateSession();
            await fs.emptyDir('./auth_info_baileys');
            if (!res.headersSent) {
                await res.send({ code: "Try After Few Minutes" });
            }
        }
    }

    await initiateSession();
});

export default router;
