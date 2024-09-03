import { Telegraf, session } from "telegraf";
import config from 'config';
import { message } from "telegraf/filters";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import { code } from "telegraf/format";
import fs from 'fs';
import path from 'path';

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Директория создана: ${dirPath}`);
    } catch (error) {
      console.error(`Ошибка при создании директории: ${error.message}`);
      throw error;
    }
  }
}

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const voiceDirPath = path.resolve(__dirname, '../voice');
ensureDirectoryExists(voiceDirPath);

let count = 0;
const INITIAL_SESSION = {
    messages: [],
};

const bot = new Telegraf(config.get('TELEGRAM_API'));

bot.use(session());

const resetSession = (ctx) => {
    ctx.session = JSON.parse(JSON.stringify(INITIAL_SESSION));
    console.log(`Сессия сброшена для пользователя ${ctx.from.id}`);
};

bot.command('new', async (ctx) => {
    resetSession(ctx);
    await ctx.reply(code("Жду сообщения или текста от тебя друг мой"));
});

bot.command('start', async (ctx) => {
    resetSession(ctx);
    await ctx.reply(code("Жду сообщения или текста от тебя друг мой"));
});

bot.on(message('voice'), async (ctx) => {
    try {
        ctx.session ??= JSON.parse(JSON.stringify(INITIAL_SESSION));
        await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
        count++;
        console.log(`Обработка голосового сообщения от пользователя ${ctx.from.id}. Счетчик: ${count}`);
        await ctx.reply(code("Сообщение принял, жди и мозги не еби"));

        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = String(ctx.message.from.id);
        const oggPath = await ogg.create(link.href, userId);
        const mp3Path = await ogg.toMP3(oggPath, userId);

        const text = await openai.transcription(mp3Path);
        console.log(`Транскрипция завершена для пользователя ${ctx.from.id}: ${text}`);
        await ctx.reply(code(`Твой запрос выглядит так: ${text}`));

        ctx.session.messages.push({ role: openai.roles.USER, content: text });
        const response = await openai.chat(ctx.session.messages);
        ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });

        await ctx.reply(response.content);
    } catch (error) {
        console.error(`Ошибка обработки голосового сообщения: ${error.message}`);
        await ctx.reply('Произошла ошибка при обработке голосового сообщения. Попробуйте еще раз.');
    }
});

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
    } catch (error) {
        console.error(`Ошибка обработки текстового сообщения: ${error.message}`);
        await ctx.reply('Произошла ошибка при обработке текстового сообщения. Попробуйте еще раз.');
    } finally {
        ctx.session.blocked = false;
    }
});

bot.catch((error) => {
    console.error(`Ошибка бота: ${error.message}`);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
