import { test, expect } from '@playwright/test';

test.describe('Login and Test Family Chain Flow', () => {
  test('should login and test married man family registration flow', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto('http://localhost:8080/login');
    await page.waitForLoadState('networkidle');
    
    console.log('Step 1: On login page');
    await page.screenshot({ path: 'test-results/01-login-page.png' });
    
    // Step 2: Enter login credentials (using default/test credentials)
    // Note: You may need to adjust these based on your actual login form
    const mobileInput = page.locator('input[type="tel"], input[name="mobile"], input[placeholder*="mobile" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await mobileInput.isVisible().catch(() => false)) {
      await mobileInput.fill('9876543210'); // Replace with valid test mobile
    }
    
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('password123'); // Replace with valid test password
    }
    
    // Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("உள்நுழை"), button[type="submit"]').first();
    await loginButton.click();
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/02-after-login.png' });
    
    console.log('Step 2: After login attempt');
    
    // Step 3: Navigate to Tax Registration page
    await page.goto('http://localhost:8080/tax/user-entry');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('Step 3: On tax registration page');
    await page.screenshot({ path: 'test-results/03-tax-page.png' });
    
    // Step 4: Verify Gender and Marital Status selectors exist
    const genderLabel = page.locator('text=Gender').first();
    const maritalLabel = page.locator('text=Marital Status').first();
    
    await expect(genderLabel).toBeVisible();
    await expect(maritalLabel).toBeVisible();
    console.log('✅ Gender and Marital Status selectors visible');
    
    // Step 5: Select Gender = Male
    const genderSelect = page.locator('select').filter({ has: page.locator('option[value="male"]') }).first();
    await genderSelect.selectOption('male');
    console.log('✅ Selected Gender: Male');
    await page.screenshot({ path: 'test-results/04-gender-selected.png' });
    
    // Step 6: Select Marital Status = Married
    const maritalSelect = page.locator('select').filter({ has: page.locator('option[value="married"]') }).first();
    await maritalSelect.selectOption('married');
    console.log('✅ Selected Marital Status: Married');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/05-married-selected.png' });
    
    // Step 7: Verify Family Reference section appears
    const familySection = page.locator('text=Family Reference (Father/Husband)').first();
    await expect(familySection).toBeVisible({ timeout: 5000 });
    console.log('✅ Family Reference section visible');
    
    // Step 8: Verify Wife Details section appears
    const wifeNameLabel = page.locator('text=Wife\'s Name').first();
    await expect(wifeNameLabel).toBeVisible({ timeout: 5000 });
    console.log('✅ Wife Details section visible');
    
    // Step 9: Verify Wife's Father Name field
    const wifeFatherLabel = page.locator('text=Wife\'s Father Name').first();
    await expect(wifeFatherLabel).toBeVisible({ timeout: 5000 });
    console.log('✅ Wife Father Name field visible');
    
    // Step 10: Verify Wife Contact field
    const wifeContactLabel = page.locator('text=Wife Contact').first();
    await expect(wifeContactLabel).toBeVisible({ timeout: 5000 });
    console.log('✅ Wife Contact field visible');
    
    // Step 11: Verify Separate Tax ID checkbox
    const separateCheckbox = page.locator('text=Create Separate Tax ID (New Family Branch)').first();
    await expect(separateCheckbox).toBeVisible({ timeout: 5000 });
    console.log('✅ Separate Tax ID checkbox visible');
    
    await page.screenshot({ path: 'test-results/06-all-family-sections-visible.png' });
    
    // Step 12: Fill the form
    // Fill basic details
    await page.locator('input[type="tel"]').first().fill('9876543999');
    
    // Find and fill name input (look for input near Name label)
    const nameInput = page.locator('label:has-text("Name") + input, label:has-text("Name") ~ input').first();
    await nameInput.fill('Test Married Man');
    
    // Fill father name
    const fatherInput = page.locator('label:has-text("Father Name") + input, label:has-text("Father Name") ~ input').first();
    await fatherInput.fill('Test Father Name');
    
    // Fill wife name
    const wifeNameInput = page.locator('label:has-text("Wife\'s Name") + input, label:has-text("Wife\'s Name") ~ input').first();
    await wifeNameInput.fill('Test Wife Name');
    
    // Fill wife father name
    const wifeFatherInput = page.locator('label:has-text("Wife\'s Father Name") + input, label:has-text("Wife\'s Father Name") ~ input').first();
    await wifeFatherInput.fill('Wife Father Name');
    
    // Fill address
    const addressInput = page.locator('textarea, input').filter({ hasText: /Address/ }).first();
    if (await addressInput.isVisible().catch(() => false)) {
      await addressInput.fill('123 Test Street, Chennai');
    }
    
    console.log('✅ Form fields filled');
    await page.screenshot({ path: 'test-results/07-form-filled.png' });
    
    // Step 13: Test Family Reference Search
    // Try to enter a reference number in the family search
    const familyRefInput = page.locator('input[placeholder*="father" i], input[placeholder*="reference" i]').filter({ has: page.locator('..:has-text("Family")') }).first();
    if (await familyRefInput.isVisible().catch(() => false)) {
      await familyRefInput.fill('T-2024-001');
      console.log('✅ Entered family reference number');
      
      // Click search button
      const searchButton = page.locator('button').filter({ hasText: '🔍' }).first();
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked family search button');
        await page.screenshot({ path: 'test-results/08-family-search-clicked.png' });
      }
    }
    
    console.log('\n=== Family Chain UI Test Complete ===');
    console.log('All sections verified:');
    console.log('- ✅ Gender & Marital Status selectors');
    console.log('- ✅ Family Reference Search (conditional)');
    console.log('- ✅ Wife Details section (conditional)');
    console.log('- ✅ Wife Father Name field');
    console.log('- ✅ Wife Contact field');
    console.log('- ✅ Separate Tax ID checkbox');
    console.log('- ✅ Form can be filled');
  });
  
  test('should verify unmarried user does NOT see family sections', async ({ page }) => {
    // Navigate to tax page
    await page.goto('http://localhost:8080/tax/user-entry');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Select Gender = Male
    const genderSelect = page.locator('select').first();
    await genderSelect.selectOption('male');
    
    // Select Marital Status = Unmarried
    const maritalSelect = page.locator('select').nth(1);
    await maritalSelect.selectOption('unmarried');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/09-unmarried-selected.png' });
    
    // Family Reference section should NOT be visible
    const familySection = page.locator('text=Family Reference (Father/Husband)');
    await expect(familySection).not.toBeVisible();
    console.log('✅ Family Reference section hidden for unmarried');
    
    // Wife's Name should NOT be visible
    const wifeNameLabel = page.locator('text=Wife\'s Name');
    await expect(wifeNameLabel).not.toBeVisible();
    console.log('✅ Wife Details hidden for unmarried');
  });
  
  test('should verify female married user does NOT see family sections', async ({ page }) => {
    // Navigate to tax page
    await page.goto('http://localhost:8080/tax/user-entry');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Select Gender = Female
    const genderSelect = page.locator('select').first();
    await genderSelect.selectOption('female');
    
    // Select Marital Status = Married
    const maritalSelect = page.locator('select').nth(1);
    await maritalSelect.selectOption('married');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/10-female-married-selected.png' });
    
    // Family Reference section should NOT be visible (per flowchart - only for males)
    const familySection = page.locator('text=Family Reference (Father/Husband)');
    await expect(familySection).not.toBeVisible();
    console.log('✅ Family Reference section hidden for female');
    
    // Wife's Name should NOT be visible
    const wifeNameLabel = page.locator('text=Wife\'s Name');
    await expect(wifeNameLabel).not.toBeVisible();
    console.log('✅ Wife Details hidden for female');
  });
});
