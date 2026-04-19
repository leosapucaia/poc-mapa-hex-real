import { test, expect } from '@playwright/test'

/**
 * Visual evidence capture — runs the demo pipeline and takes screenshots.
 * Designed for CI: no user interaction needed, uses the Demo button.
 */

test.describe('Visual Evidence', () => {
  test('capture 2D and 3D screenshots', async ({ page }) => {
    // 1. Open app
    await page.goto('/')
    await expect(page.getByText('🗺️ POC — Mapa Hexagonal')).toBeVisible()

    // 2. Screenshot — initial state
    await page.screenshot({ path: 'e2e-screenshots/01-initial.png', fullPage: false })

    // 3. Click Demo button
    await page.getByTestId('demo-button').click()

    // 4. Wait for pipeline to complete (status changes to ready)
    await expect(page.getByTestId('status-ready')).toBeVisible({ timeout: 90_000 })

    // 5. Screenshot — 2D view with hex grid
    await page.screenshot({ path: 'e2e-screenshots/02-2d-hex-grid.png', fullPage: false })

    // 6. Switch to 3D view
    await page.getByTestId('view-3d').click()
    await page.waitForTimeout(2000) // Let Three.js render

    // 7. Screenshot — 3D view
    await page.screenshot({ path: 'e2e-screenshots/03-3d-hex-map.png', fullPage: false })

    // 8. Verify status shows cell count
    const statusText = await page.getByTestId('status-ready').textContent()
    expect(statusText).toContain('hexágonos')
    console.log(`✅ Pipeline result: ${statusText}`)
  })
})
