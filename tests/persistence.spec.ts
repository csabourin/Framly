import { test, expect, type Page } from '@playwright/test';
import { openApp, applyTemplate, selectContainer } from './helpers';

async function saved(page: Page) {
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'saved');
}
function hero(page: Page) {
  return page.locator('.canvas-element[data-element-type="container"]').filter({ hasText: 'Build something people want' }).first();
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('DesignToolDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const value = await new Promise<any>((resolve, reject) => {
      const request = db.transaction('settings').objectStore('settings').get('workspace-v1');
      request.onsuccess = () => resolve(request.result.data);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  });
}

async function controlWrites(page: Page) {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      const request = key === undefined ? original.call(this, value) : original.call(this, value, key);
      if (this.name === 'settings' && value.id === 'workspace-v1') {
        const transaction = this.transaction;
        request.addEventListener('success', () => {
          if ((window as any).abortWorkspaceWrite) transaction.abort();
          else if ((window as any).holdWorkspaceWrite) {
            const hold = () => {
              const keepAlive = transaction.objectStore('settings').get('hold-test');
              keepAlive.onsuccess = () => { if ((window as any).holdWorkspaceWrite) hold(); };
            };
            hold();
          }
        });
      }
      return request;
    };
  });
}

test('acknowledged edits and the undo/redo position survive immediate reloads', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  await selectContainer(hero(page));
  await page.getByTestId('spacing-padding-top').press('Shift+ArrowUp');
  await expect(hero(page)).toHaveCSS('padding-top', '38px');
  await saved(page);
  await page.reload();
  await expect(hero(page)).toHaveCSS('padding-top', '38px');
  await page.getByTestId('button-undo').click();
  await expect(hero(page)).toHaveCSS('padding-top', '28px');
  await saved(page);
  await page.reload();
  await expect(hero(page)).toHaveCSS('padding-top', '28px');
  await expect(page.getByTestId('button-redo')).toBeEnabled();
  await page.getByTestId('button-redo').click();
  await expect(hero(page)).toHaveCSS('padding-top', '38px');
  await saved(page);
});

test('class-only edits are saved before the history debounce and restore with undo', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  const heading = page.locator('.canvas-element[data-element-type="heading"]').filter({ hasText: 'Build something people want' });
  await heading.click();
  await page.getByTestId('property-search').fill('Text Size');
  await page.getByTestId('group-header-text').click();
  const input = page.getByTestId('property-fontSize').getByTestId('input-fontSize');
  await input.fill('40');
  await input.press('Enter');
  await saved(page);
  const before = await snapshot(page);
  await input.fill('44');
  await input.press('Enter');
  await expect(heading).toHaveCSS('font-size', '44px');
  await saved(page);
  const after = await snapshot(page);
  expect(after.project).toEqual(before.project);
  expect(after.classes).not.toEqual(before.classes);
  await page.reload();
  await expect(heading).toHaveCSS('font-size', '44px');
  await heading.click();
  await page.getByTestId('property-search').fill('Text Size');
  await page.getByTestId('group-header-text').click();
  await input.fill('48');
  await input.press('Enter');
  await saved(page);
  await page.reload();
  await expect(heading).toHaveCSS('font-size', '48px');
  await expect(page.getByTestId('button-undo')).toBeEnabled();
  await page.getByTestId('button-undo').click();
  await expect(heading).toHaveCSS('font-size', '44px');
});

test('Saved waits for transaction completion and queued edits keep the newest value', async ({ page }) => {
  await controlWrites(page);
  await openApp(page);
  await applyTemplate(page, 'landing');
  await selectContainer(hero(page));
  await saved(page);
  await page.evaluate(() => { (window as any).holdWorkspaceWrite = true; });
  const handle = page.getByTestId('spacing-padding-top');
  await handle.press('ArrowUp');
  await expect(hero(page)).toHaveCSS('padding-top', '29px');
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'saving');
  await handle.press('Shift+ArrowUp');
  await expect(hero(page)).toHaveCSS('padding-top', '39px');
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'saving');
  await page.evaluate(() => { (window as any).holdWorkspaceWrite = false; });
  await saved(page);
  await page.reload();
  await expect(hero(page)).toHaveCSS('padding-top', '39px');
});

test('an aborted save preserves the previous snapshot, exposes retry, and backs up unsaved edits', async ({ page }) => {
  await controlWrites(page);
  await openApp(page);
  await applyTemplate(page, 'landing');
  await selectContainer(hero(page));
  await saved(page);
  const before = await snapshot(page);
  await page.evaluate(() => { (window as any).abortWorkspaceWrite = true; });
  await page.getByTestId('spacing-padding-top').press('Shift+ArrowUp');
  await expect(page.getByTestId('button-persistence-status')).toHaveAttribute('data-save-state', 'error');
  expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('button-persistence-status').click();
  await expect(page.getByRole('alert')).toContainText('Changes could not be saved');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('button-export-data').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  const active = backup.workspace.project.tabs[backup.workspace.project.activeTabId];
  expect(Object.values<any>(active.elements).some((element) => element.styles.paddingTop === '38px')).toBe(true);
  await page.evaluate(() => { (window as any).abortWorkspaceWrite = false; });
  await page.getByTestId('button-retry-save').click();
  await saved(page);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(hero(page)).toHaveCSS('padding-top', '38px');
});

test('legacy projects migrate without overwriting their recoverable originals', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  await saved(page);
  const legacy = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('DesignToolDB'); request.onsuccess = () => resolve(request.result);
    });
    const transaction = db.transaction(['settings', 'projects'], 'readwrite');
    const settings = transaction.objectStore('settings');
    const request = settings.get('workspace-v1');
    let legacyProject: any;
    request.onsuccess = () => {
      const project = request.result.data.project;
      legacyProject = { id: 'default-project', name: 'Legacy project',
        elements: project.tabs[project.activeTabId].elements, breakpoints: project.breakpoints };
      transaction.objectStore('projects').put(legacyProject);
      settings.delete('workspace-v1');
    };
    await new Promise<void>((resolve) => { transaction.oncomplete = () => resolve(); });
    db.close(); return legacyProject;
  });
  await page.evaluate(async (project) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('DesignToolHistory'); request.onsuccess = () => resolve(request.result);
    });
    const transaction = db.transaction('historyEntries', 'readwrite');
    transaction.objectStore('historyEntries').clear();
    transaction.objectStore('historyEntries').put({ id: 'legacy-history-entry', timestamp: 1,
      action: 'legacy/edit', description: 'Legacy edit', canvasState: { project }, classState: {} });
    await new Promise<void>((resolve) => { transaction.oncomplete = () => resolve(); }); db.close();
  }, legacy);
  await page.reload();
  await expect(hero(page)).toBeVisible();
  await saved(page);
  expect((await snapshot(page)).project.name).toBe('Legacy project');
  const original = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('DesignToolDB'); request.onsuccess = () => resolve(request.result);
    });
    const result = await new Promise<any>((resolve) => {
      const request = db.transaction('projects').objectStore('projects').get('default-project');
      request.onsuccess = () => resolve(request.result);
    });
    db.close(); return result;
  });
  expect(original.elements).toBeDefined();
  expect(original.tabs).toBeUndefined();
  await page.reload();
  await expect(hero(page)).toBeVisible();
  await saved(page);
});

test('an unknown saved format is preserved and never replaced with a blank project', async ({ page }) => {
  await openApp(page);
  await saved(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('DesignToolDB'); request.onsuccess = () => resolve(request.result);
    });
    const transaction = db.transaction('settings', 'readwrite');
    transaction.objectStore('settings').put({ id: 'workspace-v1', data: { version: 999, original: 'keep me' } });
    await new Promise<void>((resolve) => { transaction.oncomplete = () => resolve(); }); db.close();
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('stored data has been preserved');
  expect(await snapshot(page)).toEqual({ version: 999, original: 'keep me' });
  await expect(page.getByTestId('header-main')).toHaveCount(0);
});

test('immediate saving does not rewrite the entire undo stack on every edit', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).historyWrites = 0;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === 'settings' && String(value.id).startsWith('workspace-history:')) (window as any).historyWrites++;
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    };
  });
  await openApp(page);
  await applyTemplate(page, 'landing');
  await selectContainer(hero(page));
  for (let index = 0; index < 6; index++) {
    await page.getByTestId('spacing-padding-top').press('ArrowUp');
    await expect(hero(page)).toHaveCSS('padding-top', `${29 + index}px`);
  }
  await saved(page);
  const count = (await snapshot(page)).history.entries.length;
  expect(count).toBeGreaterThan(6);
  await page.evaluate(() => { (window as any).historyWrites = 0; });
  await page.getByTestId('spacing-padding-top').press('ArrowUp');
  await saved(page);
  const writes = await page.evaluate(() => (window as any).historyWrites);
  expect(writes).toBeGreaterThan(0);
  expect(writes).toBeLessThan(count);
});

test('a backup restores styles and keeps a recovery copy of the replaced workspace', async ({ page }) => {
  await openApp(page);
  await applyTemplate(page, 'landing');
  await selectContainer(hero(page));
  await page.getByTestId('property-search').fill('Inner Spacing');
  await page.getByTestId('spacing-preset-padding-16').click();
  await expect(hero(page)).toHaveCSS('padding', '16px');
  await saved(page);
  await page.getByTestId('button-persistence-status').click();
  const downloading = page.waitForEvent('download');
  await page.getByTestId('button-export-data').click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  await page.keyboard.press('Escape');
  await page.getByTestId('spacing-preset-padding-32').click();
  await expect(hero(page)).toHaveCSS('padding', '32px');
  await saved(page);
  await page.getByTestId('button-persistence-status').click();
  page.on('dialog', (dialog) => dialog.accept());

  // Import restores the workspace in memory and *then* reloads the page
  // (PersistenceStatus.handleImport). Both assertions below are satisfied by
  // the in-memory restore, so without waiting they can pass on the doomed
  // context and the IndexedDB read that follows collides with the reload
  // tearing it down. Arm the wait before the trigger: a load state cannot be
  // waited for after the fact, and `waitForLoadState` would return at once on
  // the page that is about to be replaced.
  const reloaded = page.waitForEvent('load');
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('button-import-data').focus();
  await page.getByTestId('button-import-data').press('Enter');
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await reloaded;
  await expect(hero(page)).toHaveCSS('padding', '16px');
  await saved(page);
  const recovery = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('DesignToolDB'); request.onsuccess = () => resolve(request.result);
    });
    const result = await new Promise<any>((resolve) => {
      const request = db.transaction('settings').objectStore('settings').get('workspace-before-import');
      request.onsuccess = () => resolve(request.result.data);
    }); db.close(); return result;
  });
  expect(Object.values<any>(recovery.classes.customClasses).some((item) => item.styles.padding === '32px')).toBe(true);
  expect(recovery.history.entries.every((entry: any) => entry.canvasState?.project)).toBe(true);
});
