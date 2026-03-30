// server/plugin.js
// @ts-check

import Fastify from 'fastify';
import AutoLoad from '@fastify/autoload';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';
import config from '../config/config.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Инициализация приложения Fastify с базой данных
 * @param {Fastify.FastifyInstance} app
 */
export default async function init(app) {
  // определяем окружение
  const env = process.env.NODE_ENV || 'development';

  // выбираем конфиг базы
  const dbConfig = config[env];

  // инициализация Sequelize
  const sequelize = new Sequelize(dbConfig);

  // добавляем модели
  const modelsPath = path.join(__dirname, 'models');
  await AutoLoad(app, {
    dir: modelsPath,
    options: { sequelize },
  });

  // пробуем подключиться к базе
  try {
    await sequelize.authenticate();
    console.log(`Database connected (${env})`);
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  // добавляем объект db в app, чтобы тесты могли использовать
  app.decorate('db', { sequelize, models: sequelize.models });

  // роуты
  app.get('/', async () => ({ hello: 'world' }));

  app.get('/articles', async () => {
    const articles = await app.db.models.Article.findAll();
    return { articles };
  });

  app.get('/articles/new', async () => ({ form: 'new article form' }));

  app.get('/articles/:id', async (request) => {
    const article = await app.db.models.Article.findByPk(request.params.id);
    if (!article) return app.notFound();
    return { article };
  });

  app.post('/articles', async (request, reply) => {
    const article = await app.db.models.Article.create(request.body.data);
    reply.status(302).send({ id: article.id });
  });

  app.patch('/articles/:id', async (request, reply) => {
    const article = await app.db.models.Article.findByPk(request.params.id);
    if (!article) return app.notFound();
    await article.update(request.body.data);
    reply.status(302).send();
  });

  app.delete('/articles/:id', async (request, reply) => {
    const article = await app.db.models.Article.findByPk(request.params.id);
    if (!article) return app.notFound();
    await article.destroy();
    reply.status(302).send();
  });
}

// Если запуск напрямую (например `node server/plugin.js`)
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  const app = Fastify({ logger: true });
  init(app).then(() => {
    const port = process.env.PORT || 8080;
    app.listen({ port, host: '0.0.0.0' }).then(() => {
      console.log(`Server running on port ${port}`);
    });
  });
}