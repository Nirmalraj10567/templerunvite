import { test, expect } from '@playwright/test';

test.describe('Family Chain Tax Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the tax registration page
    await page.goto('/tax/user-entry');
    await page.waitForLoadState('networkidle');
  });

  test('should display Gender and Marital Status selectors', async ({ page }) => {
    // Check if Gender selector is visible
    const genderLabel = page.locator('text=Gender').first();
    await expect(genderLabel).toBeVisible();

    // Check if Marital Status selector is visible
    const maritalLabel = page.locator('text=Marital Status').first();
    await expect(maritalLabel).toBeVisible();

    // Check if dropdowns exist
    const genderSelect = page.locator('select').filter({ hasText: /Male|Female/ });
    const maritalSelect = page.locator('select').filter({ hasText: /Married|Unmarried/ });
    
    await expect(genderSelect).toBeVisible();
    await expect(maritalSelect).toBeVisible();
  });

  test('should show Family Reference section when Married + Male selected', async ({ page }) => {
    // Select Gender = Male
    await page.locator('select').nth(0).selectOption('male');
    
    // Select Marital Status = Married
    await page.locator('select').nth(1).selectOption('married');
    
    // Wait for Family Reference section to appear
    const familySection = page.locator('text=Family Reference (Father/Husband)');
    await expect(familySection).toBeVisible();
    
    // Check for the search input
    const searchInput = page.locator('input[placeholder*="father\'s reference" i]');
    await expect(searchInput).toBeVisible();
    
    // Check for the search button
    const searchButton = page.locator('button:has-text("🔍")').filter({ has: page.locator('..') });
    await expect(searchButton).toBeVisible();
  });

  test('should show Wife Details section when Married + Male selected', async ({ page }) => {
    // Select Gender = Male
    await page.locator('select').nth(0).selectOption('male');
    
    // Select Marital Status = Married
    await page.locator('select').nth(1).selectOption('married');
    
    // Check for Wife's Name input
    const wifeNameLabel = page.locator('text=Wife\'s Name').first();
    await expect(wifeNameLabel).toBeVisible();
    
    // Check for Wife's Father Name input
    const wifeFatherLabel = page.locator('text=Wife\'s Father Name').first();
    await expect(wifeFatherLabel).toBeVisible();
    
    // Check for Wife Contact input
    const wifeContactLabel = page.locator('text=Wife Contact').first();
    await expect(wifeContactLabel).toBeVisible();
  });

  test('should show Separate Tax ID checkbox for married males', async ({ page }) => {
    // Select Gender = Male
    await page.locator('select').nth(0).selectOption('male');
    
    // Select Marital Status = Married
    await page.locator('select').nth(1).selectOption('married');
    
    // Check for the checkbox
    const checkbox = page.locator('input[type="checkbox"]').filter({ hasText: /Separate Tax ID/ });
    await expect(checkbox).toBeVisible();
    
    // Check for the label text
    const label = page.locator('text=Create Separate Tax ID (New Family Branch)');
    await expect(label).toBeVisible();
  });

  test('should NOT show family section for unmarried users', async ({ page }) => {
    // Select Gender = Male
    await page.locator('select').nth(0).selectOption('male');
    
    // Select Marital Status = Unmarried
    await page.locator('select').nth(1).selectOption('unmarried');
    
    // Family Reference section should NOT be visible
    const familySection = page.locator('text=Family Reference (Father/Husband)');
    await expect(familySection).not.toBeVisible();
    
    // Wife's Name should NOT be visible
    const wifeNameLabel = page.locator('text=Wife\'s Name').first();
    await expect(wifeNameLabel).not.toBeVisible();
  });

  test('should NOT show family section for females', async ({ page }) => {
    // Select Gender = Female
    await page.locator('select').nth(0).selectOption('female');
    
    // Select Marital Status = Married
    await page.locator('select').nth(1).selectOption('married');
    
    // Family Reference section should NOT be visible (per flowchart)
    const familySection = page.locator('text=Family Reference (Father/Husband)');
    await expect(familySection).not.toBeVisible();
    
    // Wife's Name should NOT be visible
    const wifeNameLabel = page.locator('text=Wife\'s Name').first();
    await expect(wifeNameLabel).not.toBeVisible();
  });

  test('should fill form and submit married man registration', async ({ page }) => {
    // Fill required personal status
    await page.locator('select').nth(0).selectOption('male');
    await page.locator('select').nth(1).selectOption('married');
    
    // Wait for family section to appear
    await page.waitForSelector('text=Family Reference (Father/Husband)');
    
    // Fill basic details
    await page.locator('input[type="tel"]').first().fill('9876543210');
    await page.locator('input').filter({ hasText: /Name/ }).first().fill('Test Married Man');
    
    // Fill wife details - use labels to find inputs
    await page.locator('label:has-text("Wife\'s Name") + input, label:has-text("Wife\'s Name"):has(~ input)').first().fill('Test Wife');
    await page.locator('label:has-text("Wife\'s Father Name") + input, label:has-text("Wife\'s Father Name"):has(~ input)').first().fill('Wife Father Name');
    
    // Fill tax amount - use label text
    await page.locator('text=Tax Amount').first().locator('..').locator('input').fill('1000');
    await page.locator('text=Amount Paid').first().locator('..').locator('input').fill('1000');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/married-man-form-filled.png' });
    
    // Note: Actual submit would require authentication and valid backend
    // await page.locator('button:has-text("Save")').click();
  });
});
