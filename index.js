const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fs = require('fs');
const PizZip = require('pizzip');
const sequelize = require('./db');
const Usage = require('./models/Usage');
const Docxtemplater = require('docxtemplater');

const token = process.env.TOKEN_BOT;
const webAppUrl = 'https://tg-document-generator.vercel.app/';
const bot = new TelegramBot(token, { polling: true });

(async () => {
  await sequelize.sync();

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id.toString();

    if (text === '/start') {
      await bot.sendMessage(chatId, 'Plăcută utilizare, de asemenea, suntem mereu deschiși la feedback-ul dumneavoastră.', {
        reply_markup: {
          keyboard: [
            [{ text: " 📑 Creare documentului ", web_app: { url: webAppUrl + '/form' } }],
          ]
        }
      });
    }

    if (text === '/stats') {
      try {
        const totalUsers = await Usage.count();
        const totalUses = await Usage.sum('count');
        
        // Получение количества использований текущего пользователя
        const userUsageCount = await getUserUsageCount(userId);

        const userUsageMessage = userUsageCount !== null
          ? `📈Numărul total de utilizări din contul dvs. ${userUsageCount}`
          : '❌Nu s-au putut obține datele despre utilizarea dvs.';

          await bot.sendMessage(chatId, `📊Statistica botului:\n\n${userUsageMessage}\n\n👥Număr total de utilizatori: ${totalUsers}\n\n📉 Numărul total de utilizări: ${totalUses}`);
        console.log(`Număr total de utilizatori: ${totalUsers}\nNumărul total de utilizări: ${totalUses}\n${userUsageMessage}`);

      } catch (error) {
        console.error('Error fetching stats:', error);
        await bot.sendMessage(chatId, '⚠️ A apărut o eroare, vă rugăm să încercați din nou mai târziu');
      }
    }

    if (msg?.web_app_data?.data) {
      try {
        const data = JSON.parse(msg?.web_app_data?.data);
        console.log(data);
        const generatedDoc = await generateDocFromTemplate(data);
        if (generatedDoc) {
          const outputPath = `${data.objectName}.docx`;
          fs.writeFileSync(outputPath, generatedDoc);

          await bot.sendDocument(chatId, outputPath, {
            caption: '📄Document generat, multumesc pentru vizita'
          }).then(async () => {
            fs.unlinkSync(outputPath);

            // Учет использования бота после успешной генерации файла
            try {
              let usage = await Usage.findOne({ where: { userId: userId } });

              if (!usage) {
                await Usage.create({ userId, count: 1 });
              } else {
                usage.count += 1;
                await usage.save();
              }
            } catch (error) {
              console.error('Error tracking usage:', error);
            }

            await bot.sendMessage(chatId, 'Dacă doriți să vedeți statistica botului, apăsați pe /stats');
          }).catch((error) => {
            console.error('Error sending document:', error);
          });
        } else {
          await bot.sendMessage(chatId, '⚠️ Error, please try later.');
        }
      } catch (e) {
        console.log(e);
      }
    }
  });
})();

async function generateDocFromTemplate(data) {
  try {
    const template = fs.readFileSync('sablon.docx', 'binary');
    const zip = new PizZip(template);
    const doc = new Docxtemplater(zip);
    const currentYear = new Date().getFullYear();
    doc.setData({
      CURRENT_YEAR: currentYear,
      OBJECT_NAME: data.objectName,
      OBJECT_ADDRESS: data.objectAddress,
      SYSTEM_TYPE: data.systemType,
      PERSON_JUR_NAME: data.personJurName,
      ANTREPRENOR_NAME: data.antreprenorName,
      SUBANTREPRENOR_NAME: data.subantreprenorName,
      BEN_NAME: data.benName,
      TEHNIC_NAME: data.tehnicName,
      REPREZENT_NAME: data.reprezentName,
      MANAGER_NAME: data.managerName,
      DIRIG_NAME: data.dirigName,
      FLOOR_COUNT: data.floorCount,
      TOTAL_AREA: data.totalArea,
      PROCEL_VERBAL_DATA_EXAM: data.procelVerbalDataExam,
      CLAD_INALT: data.cladInalt,
      TAVAN_INALT: data.tavanInalt,
      PROJECT_ID: data.projectId,
      DOC_ID: data.documentId,
      COMPANY_PROJECT: data.companyProject,
      PROCES_VERB_FINAL: data.dataFinishObject,
      DATA_START_LUCRU_CABL: data.dataStartLucruCabl,
      DATA_FINISH_LUCRU_CABL: data.dataFinishLucruCabl,
      DATA_START_LUCRU_MONT: data.dataStartLucruMont,
      DATA_FINISH_LUCRU_MONT: data.dataFinishLucruMont
    });

    doc.render();

    const generatedDoc = doc.getZip().generate({ type: 'nodebuffer' });

    return generatedDoc;
  } catch (error) {
    console.error('Error generating document:', error);
    return null;
  }
}

// Функция для получения количества использований конкретного пользователя
async function getUserUsageCount(userId) {
  try {
    // Запрос к базе данных для получения количества использований пользователя
    const userUsage = await Usage.sum('count', { where: { userId: userId } });
    return userUsage || 0; 
  } catch (error) {
    console.error('Error fetching user usage count:', error);
    return null;
  }
}
