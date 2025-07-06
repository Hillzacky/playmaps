
import express from 'express';
import { Router } from 'express';

import { getData, getMultipleData } from './maps.js';
const router = Router();

router.get('/', (req, res) => {
  const title = req.app.locals.siteTitle;
  res.send(title, res.status());
});

router.get('/single', (req, res) => {
  try {
  const { find = 'Toko', mylonglat = '@-6.9351394,106.9323303,13z' } = req.query;
  const uri = `https://www.google.com/maps/search/${encodeURI(find)}/${mylonglat}`;
    getData(uri);
    res.json({
      success: true,
      message: `Data yang diminta: ${find}`,
    });
    } catch (err) {
    res.status(500).json({ 
      status: 'err',
      message: err.message,
      data: {
        find,
        uri
      }
    });
  }
});

router.get('/bulk', (req, res) => {
  try {
    const { find = "Toko" } = req.query;
    const uri = encodeURI(find);
    getMultipleData(uri);
    res.json({
      success: true,
      message: `Data yang diminta: ${find}`,
    });
    } catch (err) {
    res.status(500).json({ 
      status: 'err',
      message: err.message,
      data: {
        find
      }
    });
  }
});


export default router