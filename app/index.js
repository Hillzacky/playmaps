import os from 'os';
import dotenv from 'dotenv';
import express from 'express';
import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';
import router from './src/routers.js';

const app = express();
const port = process.env.APP_PORT || 3000;
const nodename = os.hostname();

dotenv.config();

app.locals.siteTitle = "My App";
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ "status": 500, "error": err});
});

app.listen(port, () => {
    console.log(`Listening: ://${nodename}:${port}`);
});

export default app;