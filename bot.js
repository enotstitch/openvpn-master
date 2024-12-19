import { Bot, Keyboard, session } from 'grammy';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Загружаем переменные окружения из .env
dotenv.config();

// Получаем токен из переменной окружения
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Ошибка: Токен бота не найден!');
  process.exit(1); // Выход, если токен не найден
}

// Создаём объект бота
const bot = new Bot(token);

// Настроим сессии для диалогов
bot.use(
  session({
    initial: () => ({ awaitingClientName: false }), // Инициализация сессии для каждого пользователя
    parseMode: 'Markdown', // Чтобы можно было отправлять сообщения с разметкой
  })
);

// Приветственное сообщение и клавиатура
bot.command('start', async (ctx) => {
  const keyboard = new Keyboard()
    .text('Создать клиента OpenVPN')
    .row()
    .text('Помощь')
    .row()
    .text('Настройки');

  await ctx.reply(
    'Привет! Я бот для управления OpenVPN. Выберите опцию из меню ниже:',
    {
      reply_markup: {
        keyboard: keyboard.build(),
        resize_keyboard: true, // Уменьшаем размер кнопок
      },
    }
  );
});

// Обработка кнопок
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  if (text === 'Создать клиента OpenVPN') {
    // Начинаем процесс создания клиента
    await ctx.reply(
      'Введите имя для нового клиента (только маленькие буквы, цифры и нижние подчеркивания):'
    );
    // Сохраняем, что бот ожидает имя клиента
    ctx.session.awaitingClientName = true;
  } else if (text === 'Помощь') {
    await ctx.reply(
      'Чтобы создать клиента, используйте команду /create <имя клиента>.'
    );
  } else if (text === 'Настройки') {
    await ctx.reply('Здесь будут настройки для бота.');
  } else if (ctx.session.awaitingClientName) {
    // Когда бот ожидает имя клиента
    const clientName = ctx.message.text;

    // Проверка имени пользователя
    const isValid = /^[a-z0-9_]+$/.test(clientName);

    if (isValid) {
      ctx.session.awaitingClientName = false;

      // Генерация клиента OpenVPN и создание файла
      try {
        await generateClient(clientName);

        // Путь к созданному конфигу
        const clientConfigPath = `/etc/openvpn/client-configs/${clientName}.ovpn`;

        // Отправка файла пользователю
        await ctx.reply(
          `Клиент "${clientName}" успешно создан! Файл для него был сгенерирован.`
        );
        await ctx.replyWithDocument({
          source: fs.createReadStream(clientConfigPath),
        });
      } catch (error) {
        await ctx.reply(
          'Произошла ошибка при создании клиента. Попробуйте снова.'
        );
      }
    } else {
      await ctx.reply(
        'Ошибка! Имя клиента может содержать только маленькие буквы, цифры и нижние подчеркивания.'
      );
    }
  }
});

// Функция для генерации клиента OpenVPN
function generateClient(clientName) {
  return new Promise((resolve, reject) => {
    const command = `./create_client.sh ${clientName}`; // Ваш скрипт для создания клиента OpenVPN

    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(error || stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Запуск бота
bot.start().catch((error) => {
  console.error('Ошибка при запуске бота:', error);
});
