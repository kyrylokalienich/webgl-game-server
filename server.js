const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { message } = require("telegraf/filters");
const path = require('path');
const process = require('process');
const ngrok = require("@ngrok/ngrok");
const bodyParser = require('body-parser');
require('dotenv').config()

const HOOK_PATH = process.env.HOOK_PATH || "hook";

const gameName = "panelki";
const rules = `aa`
const gameUrlGithub = "https://kyrylokalienich.github.io/test-webgl2only/";

const app = express();

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

// Use the whole root as static files to be able to serve the html file and
// the build folder
app.use(express.static(path.join(__dirname, '/'), {
    setHeaders: function (res, path) {
        if (path.match('.br')) {
            res.set('Content-Encoding', 'br');
            res.set('Content-Type', 'application/wasm');
        }
    }
}));



app.use((req, res, next) => {
    const secret = req.get('X-Telegram-Bot-Api-Secret-Token');

    if (process.env.SECRET_TOKEN !== secret) {
        return res.sendStatus(301);
    }

    next();
})

const bot = new Telegraf(process.env.BOT_TOKEN, {
    telegram: { webhookReply: true },
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

if (process.env.NODE_ENV === 'development') {

    const setupNgrok = async () => {
        await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
        const url = await ngrok.connect({ addr: process.env.PORT });
        console.log('url', url)
        bot.telegram.setWebhook(`${url}/${HOOK_PATH}`, {
            secret_token: process.env.SECRET_TOKEN,
            allowed_updates: ['message']
        })

        app.post(`/${HOOK_PATH}`, async (req, res) => {
            bot.handleUpdate(req.body, res);
        })

        bot.on(message('text'), async (ctx) => {
            console.log('#msg');
            bot.telegram.sendGame(ctx.chat.id, gameName);

            /* await ctx.reply(rules, Markup.inlineKeyboard([
                {
                    text: "🤟Let's play🤟!!!",
                    web_app: {
                        url:url
                    },
                },
                { text: "Open in browser", url: url, try_instant_view:true } ])); */
        });

        bot.gameQuery((ctx) => ctx.answerGameQuery(url));
        bot.launch();

    }
    setupNgrok();
} else {
    bot.telegram.setWebhook(`${process.env.APP_ENDPOINT}/${HOOK_PATH}`, {
        secret_token: process.env.SECRET_TOKEN,
        allowed_updates: ['message']
    })

    app.post(`/${HOOK_PATH}`, async (req, res) => {
        bot.handleUpdate(req.body, res);
    })

    bot.on(message('text'), async (ctx) => {
        console.log('#msg-else')
        await ctx.reply(rules, Markup.inlineKeyboard([{
            text: "🤟Let's play🤟!!!",
            web_app: {
                url: process.env.APP_ENDPOINT
            },
        },
        {text: "Open in browser", url: process.env.APP_ENDPOINT, try_instant_view:true}]
        ));
    });
}





app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}/`);
});