import { Telegraf, session, Markup, Scenes} from "telegraf";
import { Markup } from 'telegraf';
import config from 'config'

import {message} from "telegraf/filters";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import {code} from "telegraf/format"

let count = 0;
let INITIAL_SESSION = {
  messages: [],
}


const newContextButton = Markup.keyboard([
  Markup.button.callback('Новый контекст', 'newContext')
]).resize()

const bot = new Telegraf(config.get('TELEGRAM_API'))


bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION
  INITIAL_SESSION.messages = []
  await ctx.reply(
    code("Жду сообщения или текста от тебя друг мой")
  );
});

bot.on(message('voice'), async (ctx) =>{
  try{
    ctx.session ??= INITIAL_SESSION
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
    count = count + 1
    console.log(count);
    await ctx.reply(code("Сообщение принял, жди и мозги не еби"))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)
    const oggPath = await ogg.create(link, userId)
    const mp3 = await ogg.toMP3(oggPath, userId)
    const text = await openai.transcription(mp3) 
    

    ctx.reply(code(`Твой запрос выглядит так: ${text}`))

    ctx.session.messages.push({role: openai.roles.USER, content: text})
    const response = await openai.chat(ctx.session.messages)
    
    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content
    })
    await ctx.reply(response.content)


  } catch(error) {
    if(error.code && error.code == 400) {
      console.log("Ошибка 400 Бот упал", error.description)
      setTimeout(() => process.exit(1), 1000)
    }
    if(error.code && error.code == 429) {
      console.log("Ошибка 429 Бот упал потому что запрос большой", error.description)
      setTimeout(() => process.exit(1), 1000)
    }
  }
} )


bot.on(message('text'), async (ctx) => {
  try{ 
    ctx.session ??= INITIAL_SESSION
    if (ctx.session.blocked) {
      return;
    }
    ctx.session.blocked = true
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
    
    count = count + 1
    console.log(count);
    await ctx.reply(code("Сообщение принял, жди и мозги не еби"))
  //   const messages = [{
  //   role:openai.roles.USER,
  //   content: ctx.message.text
  // }]
  ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text})
  const response = await openai.chat(ctx.session.messages)
  
  ctx.session.messages.push({
    role: openai.roles.ASSISTANT,
    content: response.content
  })
  await ctx.reply(response.content)
  ctx.session.blocked = false
}
catch (error) {
  if(error.code && error.code == 400) {
    console.log("Ошибка 400 Бот упал", error.description)
    setTimeout(() => process.exit(1), 1000)
  }
}
})
bot.catch((error, ctx) => {
  if(error.code == 400) {
    console.log("Ошибка 400 Бот упал", error.description)
    process.on('exit', function () {
      require('child_process').spawn(process.argv.shift(), process.argv, {
        cwd: process.cwd(),
        detached: true,
        stdio: 'inherit'
      });
    });
    process.exit();
  }
  if(error.code && error.code == 429) {
    console.log("Ошибка 429 Бот упал потому что запрос большой", error.description)
    setTimeout(() => process.exit(1), 1000)
  }
})
bot.start(async (ctx) => {
  ctx.reply('Привет!', newContextButton)   
})
bot.action('newContext', (ctx) => {
  ctx.session = INITIAL_SESSION
  ctx.reply('Сессия и контекст обновлены так делай когда начинаешь новый диалог, чтобы получить более качественный ответ')
})


bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION
  await ctx.reply(code("Жду сообщения или текста от тебя друг мой"))
})




bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
