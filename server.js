import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'На сервере не настроен API-ключ. Попроси взрослого владельца проекта настроить его безопасно.' });
    }
    const { message, history = [], assistantName, assistantStyle, responseStyle } = req.body || {};
    if (typeof message !== 'string' || !message.trim() || message.length > 8000) {
      return res.status(400).json({ error: 'Сообщение пустое или слишком длинное.' });
    }
    const safeHistory = Array.isArray(history) ? history.slice(-10).filter(x =>
      x && ['user','assistant'].includes(x.role) && typeof x.text === 'string'
    ) : [];
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const instructions = [
      `Ты — ${String(assistantName || 'NOVA AI').slice(0,40)}, универсальный помощник.`,
      `Характер: ${String(assistantStyle || 'Серьёзный аналитик').slice(0,80)}.`,
      `Стиль ответов: ${String(responseStyle || 'Кратко и по делу').slice(0,80)}.`,
      'Отвечай на языке пользователя. Будь ясным, доброжелательным и безопасным.'
    ].join(' ');
    const input = [
      ...safeHistory.map(x => ({ role: x.role, content: x.text.slice(0,4000) })),
      { role: 'user', content: message.trim() }
    ];
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions,
      input
    });
    res.json({ reply: result.output_text || 'Модель не вернула текстовый ответ.' });
  } catch (err) {
    console.error('NOVA server error:', err.message);
    res.status(500).json({ error: 'Не получилось обратиться к ИИ. Проверь настройки сервера.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`NOVA AI listening on ${port}`));
