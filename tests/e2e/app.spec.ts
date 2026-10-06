import { test, expect, Page } from '@playwright/test';
import { spawn } from 'node:child_process';
async function personal(page: Page, url = '/') {
  await page.goto(url);
  await page.getByRole('button', { name: 'Começar o meu diário' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function command(page: Page, text: string) {
  await page
    .getByRole('textbox', { name: 'Comando terminal', exact: true })
    .fill(text);
  await page
    .getByRole('button', { name: 'Executar comando', exact: true })
    .click();
}
async function slider(page: Page, label: string, value: number) {
  const input = page.getByRole('slider', { name: label, exact: true });
  await input.focus();
  await input.press('Home');
  for (let i = 0; i < value; i++) await input.press('ArrowRight');
}
test('check-in, crise de vários dias e medicação persistem', async ({
  page,
}) => {
  await personal(page);
  await page.getByRole('button', { name: 'Log today', exact: true }).click();
  await slider(page, 'Dor', 6);
  await page.getByLabel('Água · litros').fill('1.8');
  await page.getByLabel('> notes:').fill('Pressão atrás do olho após almoço.');
  await page
    .getByRole('button', { name: 'Guardar registo', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.readout').first()).toContainText('6/10');
  await expect(page.locator('.stats-grid')).toContainText('1.8 L');
  await page.getByRole('button', { name: '+ Start attack' }).click();
  const old = new Date(Date.now() - 27 * 3600000);
  const local = new Date(old.getTime() - old.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel('Início da crise').fill(local);
  await page
    .getByRole('button', { name: 'Iniciar crise', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Actualizar / terminar' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Registar toma', exact: true })
    .click();
  await page
    .getByLabel('Medicamento', { exact: true })
    .selectOption({ label: 'Zolmitriptan' });
  await page.getByLabel('Dose tomada (conforme prescrita)').fill('prescrita');
  await page.getByLabel('Registar eficácia', { exact: true }).check();
  await slider(page, 'Eficácia observada', 7);
  await page.getByRole('button', { name: 'Guardar toma' }).click();
  await page.getByRole('button', { name: 'Actualizar / terminar' }).click();
  await page
    .getByRole('button', { name: 'Terminar crise', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '+ Start attack' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('.stats-grid')).toContainText('27h');
  await expect(page.locator('.timeline')).toContainText('Zolmitriptan');
});
test('demo isolada, calendário, analytics e dashboard visual', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Explorar demo', exact: true })
    .click();
  await expect(page.locator('.demo-banner')).toBeVisible();
  await expect(page.locator('.stats-grid')).toContainText('5');
  await page.screenshot({ path: '/tmp/migraine-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(page.locator('.chart')).toBeVisible();
  await expect(page.locator('.association-bars')).toContainText('Sonolência');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('.heat-cell')).toHaveCount(365);
  await page.locator('.calendar-day.normal').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page
    .getByRole('button', { name: 'Voltar aos meus dados', exact: false })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Welcome to Migraine Terminal' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Começar o meu diário' }).click();
  await expect(page.locator('.stats-grid')).toContainText('0');
  await expect(page.locator('.demo-banner')).toHaveCount(0);
});
test('comandos, PDF/CSV, backup JSON e restauro', async ({ page }) => {
  await personal(page);
  await command(page, 'log water 500ml');
  await expect(page.getByRole('status')).toContainText('Água registada');
  await command(page, 'log stress 8');
  await expect(page.getByRole('status')).toContainText('stress guardado');
  await command(page, 'log zolmitriptan');
  await expect(page.getByRole('status')).toContainText('Toma registada');
  await command(page, 'report 30d');
  await expect(page.getByRole('heading', { name: 'Reports_' })).toBeVisible();
  const pdfPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate report · PDF' }).click();
  const pdf = await pdfPromise;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const stream = await pdf.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe('%PDF');
  const csvPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  expect((await csvPromise).suggestedFilename()).toMatch(/\.csv$/);
  const backupPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup completo · JSON' }).click();
  const backup = await backupPromise;
  const backupPath = await backup.path();
  await command(page, 'log water 1l');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type=file]').setInputFiles(backupPath!);
  await expect(
    page.getByRole('status').filter({ hasText: 'Alterações guardadas' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: false }).click();
  await expect(page.locator('.stats-grid')).toContainText('0.5 L');
});
test('offline permite novo registo e PDF após recarregar', async ({
  page,
  context,
}) => {
  const server = spawn(process.execPath, ['scripts/server.mjs'], {
    env: { ...process.env, PORT: '3001' },
    stdio: 'ignore',
  });
  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch('http://127.0.0.1:3001')).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    await personal(page, 'http://127.0.0.1:3001');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    server.kill('SIGTERM');
    await expect
      .poll(async () => {
        try {
          await fetch('http://127.0.0.1:3001');
          return false;
        } catch {
          return true;
        }
      })
      .toBe(true);
    await page.reload();
    await context.setOffline(true);
    await expect(page.locator('.connection')).toContainText('OFFLINE');
    await command(page, 'log pain 4');
    await expect(page.getByRole('status')).toContainText('pain guardado');
    await page.reload();
    await expect(page.locator('.readout').first()).toContainText('4/10');
    await command(page, 'report 7d');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate report · PDF' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  } finally {
    server.kill('SIGTERM');
  }
});
test('mobile, teclado e pesquisa', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Explorar demo', exact: true })
    .click();
  await expect(page.locator('.mobile-actions')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: '/tmp/migraine-mobile.png', fullPage: true });
  await page.keyboard.press('Control+k');
  await expect(
    page.getByRole('dialog', { name: 'Command palette / search' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Comando ou pesquisa' })
    .fill('zolmitriptan');
  await page.getByRole('button', { name: 'Pesquisar nos registos' }).click();
  await expect(page.locator('.search-results>button')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .locator('.mobile-actions')
    .getByRole('button', { name: 'LOG', exact: true })
    .click();
  await expect(page.getByLabel('Data', { exact: true })).toBeVisible();
});
test('conflito entre janelas não substitui dados', async ({
  page,
  context,
}) => {
  await personal(page);
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('.readout')).toBeVisible();
  await command(page, 'log pain 7');
  await expect(page.getByRole('status')).toContainText('pain guardado');
  await command(second, 'log pain 2');
  await expect(second.getByRole('status')).toContainText('noutra janela');
  await second.reload();
  await expect(second.locator('.readout').first()).toContainText('7/10');
});

test('falha de meteorologia não bloqueia o check-in e eventos persistem', async ({
  page,
}) => {
  await personal(page);
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByLabel('Obter meteorologia ao guardar o check-in de hoje')
    .check();
  await page.getByLabel('Latitude', { exact: true }).fill('38.72');
  await page.getByLabel('Longitude', { exact: true }).fill('-9.14');
  await page
    .getByRole('button', { name: 'Guardar meteorologia', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Alterações guardadas' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: false }).click();
  await page.getByRole('button', { name: 'Log today', exact: true }).click();
  await page
    .getByRole('button', { name: 'Guardar registo', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Meteorologia indisponível; o registo foi guardado',
  );
  await page
    .getByRole('button', { name: 'Adicionar evento', exact: true })
    .click();
  await page
    .getByLabel('Descrição do evento', { exact: true })
    .fill('Tensão no pescoço às 14h');
  await page
    .getByRole('button', { name: 'Guardar evento', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Evento guardado');
  await page.reload();
  await expect(page.locator('.timeline')).toContainText(
    'Tensão no pescoço às 14h',
  );
});
