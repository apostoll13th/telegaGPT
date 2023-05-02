import { Telegraf, session, Markup, Scenes} from "telegraf";
import config from 'config'

import {message} from "telegraf/filters";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";
import {code} from "telegraf/format"

let count = 0;
let INITIAL_SESSION = {
  messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_API_DEV'))

// @follow-up TODO: это меню не то что нам нужно оно вызывается только при вызове команды
// bot.command('menu', (ctx) => {
//   const inlineKeyboard = {
//     inline_keyboard: [
//       [
//         { text: 'Кнопка 1', callback_data: 'button1' },
//         { text: 'Кнопка 2', callback_data: 'button2' },
//       ],
//       [
//         { text: 'Кнопка 3', callback_data: 'button3' },
//       ],
//     ],
//   };

//   ctx.telegram.sendMessage(ctx.chat.id, 'Выберите действие:', { reply_markup: inlineKeyboard });
// });

// // Обработчик нажатия на кнопки
// bot.action('button1', (ctx) => {
//   ctx.reply('Вы выбрали Кнопку 1');
// });

// bot.action('button2', (ctx) => {
//   ctx.reply('Вы выбрали Кнопку 2');
// });

// bot.action('button3', (ctx) => {
//   ctx.reply('Вы выбрали Кнопку 3');
// });





bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION
  INITIAL_SESSION.messages = []
  await ctx.reply(
    code("Жду сообщения или текста от тебя друг мой")
  );
});

// bot.command('new', async (ctx) => {
//   const button = Markup.callbackButton('Нажми на меня','pressed')
//   ctx.session = INITIAL_SESSION
//   INITIAL_SESSION.messages = []
//   await ctx.reply(code("Жду сообщения или текста от тебя друг мой"),Markup.inlineKeyboard([
//     [button]
//   ]));

// })


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


  } catch(e) {
     console.log('Error voice -  ${e}')
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
catch (e) {
  if(error.code && error.code == 400) {
    console.log("Ошибка 400: ", error.description)
    // Код для перезапуска бота, например:
    bot.launch()
  }
}
})
bot.catch((error, ctx) => {
  if(error.code && error.code == 400) {
    console.log("Ошибка 400: ", error.description)
    // Код для перезапуска бота, например:
    bot.launch()
  }
})

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION
  await ctx.reply(code("Жду сообщения или текста от тебя друг мой"))
})




bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))