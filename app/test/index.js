import { getData, getMultipleData } from '../maps.js';
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('https://www.google.com');
  await expect(page.locator('title')).toHaveText('Google');
});

/**
  try {
  const find = 'Toko', mylonglat = '@-6.9351394,106.9323303,13z';
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
**/