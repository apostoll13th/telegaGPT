import { Telegraf, session, Markup, Scenes } from "telegraf";
import config from 'config';
import { message } from "telegraf/filters";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { code } from "telegraf/format";

let count = 0;
const INITIAL_SESSION = {
    messages: [],
};

const bot = new Telegraf(config.get('TELEGRAM_API'));

// Промежуточное ПО для работы сессий
bot.use(session());

// Функция для сброса сессии
const resetSession = (ctx) => {
    ctx.session = JSON.parse(JSON.stringify(INITIAL_SESSION));
    console.log(`Сессия сброшена для пользователя ${ctx.from.id}`);
};

// Команда /new для сброса сессии
bot.command('new', async (ctx) => {
    resetSession(ctx);
    await ctx.reply(code("Жду сообщения или текста от тебя друг мой"));
});

// Команда /start для сброса сессии при старте
bot.command('start', async (ctx) => {
    resetSession(ctx);
    await ctx.reply(code("Жду сообщения или текста от тебя друг мой"));
});

// Обработка голосовых сообщений
bot.on(message('voice'), async (ctx) => {
    try {
        ctx.session ??= JSON.parse(JSON.stringify(INITIAL_SESSION));
        await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
        count++;
        console.log(`Обработка голосового сообщения от пользователя ${ctx.from.id}. Счетчик: ${count}`);
        await ctx.reply(code("Сообщение принял, жди и мозги не еби"));

        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = String(ctx.message.from.id);
        const oggPath = await ogg.create(link, userId);
        const mp3 = await ogg.toMP3(oggPath, userId);
        const text = await openai.transcription(mp3);

        console.log(`Транскрипция завершена для пользователя ${ctx.from.id}: ${text}`);
        ctx.reply(code(`Твой запрос выглядит так: ${text}`));
        ctx.session.messages.push({ role: openai.roles.USER, content: text });

        const response = await openai.chat(ctx.session.messages);
        ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });

        await ctx.reply(response.content);
    } catch (error) {
        console.error(`Ошибка обработки голосового сообщения: ${error.message}`);
        process.exit(1);
    }
});

// Обработка текстовых сообщений
bot.on(message('text'), async (ctx) => {
    try {
        ctx.session ??= JSON.parse(JSON.stringify(INITIAL_SESSION));
        if (ctx.session.blocked) return;

        ctx.session.blocked = true;
        await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
        count++;
        console.log(`Обработка текстового сообщения от пользователя ${ctx.from.id}. Счетчик: ${count}`);
        await ctx.reply(code("Сообщение принял, жди и мозги не еби"));

        ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text });
        const response = await openai.chat(ctx.session.messages);

        ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });
        await ctx.reply(response.content);

        ctx.session.blocked = false;
    } catch (error) {
        console.error(`Ошибка обработки текстового сообщения: ${error.message}`);
        process.exit(1);
    }
});

// Обработка ошибок
bot.catch((error) => {
    console.error(`Ошибка бота: ${error.message}`);
    process.exit(1);
});

// Запуск бота
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
