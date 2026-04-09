# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-and-test-family-chain.spec.ts >> Login and Test Family Chain Flow >> should login and test married man family registration flow
- Location: e2e/login-and-test-family-chain.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Gender').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Gender').first()

```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e7]:
      - link "🕉️ Temple Trust" [ref=e8] [cursor=pointer]:
        - /url: /
        - generic [ref=e10]: 🕉️
        - heading "Temple Trust" [level=1] [ref=e11]
      - generic [ref=e12]:
        - link "Home" [ref=e13] [cursor=pointer]:
          - /url: /
        - link "Login" [ref=e14] [cursor=pointer]:
          - /url: /login
        - link "Register" [ref=e15] [cursor=pointer]:
          - /url: /register
        - button "English" [ref=e16] [cursor=pointer]
    - generic [ref=e19]:
      - generic [ref=e20]:
        - heading "Sign in to your account" [level=1] [ref=e21]
        - paragraph [ref=e22]: Welcome back!
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]: Username or Mobile Number
          - textbox "Username or Mobile Number" [ref=e26]
        - generic [ref=e27]:
          - generic [ref=e28]: Password
          - textbox "Password" [ref=e29]
          - button [ref=e30] [cursor=pointer]:
            - img [ref=e31]
        - button "Sign In" [ref=e34] [cursor=pointer]
      - link "Don't have an account? Register" [ref=e36] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Login and Test Family Chain Flow', () => {
  4   |   test('should login and test married man family registration flow', async ({ page }) => {
  5   |     // Step 1: Navigate to login page
  6   |     await page.goto('http://localhost:8080/login');
  7   |     await page.waitForLoadState('networkidle');
  8   |     
  9   |     console.log('Step 1: On login page');
  10  |     await page.screenshot({ path: 'test-results/01-login-page.png' });
  11  |     
  12  |     // Step 2: Enter login credentials (using default/test credentials)
  13  |     // Note: You may need to adjust these based on your actual login form
  14  |     const mobileInput = page.locator('input[type="tel"], input[name="mobile"], input[placeholder*="mobile" i]').first();
  15  |     const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  16  |     
  17  |     if (await mobileInput.isVisible().catch(() => false)) {
  18  |       await mobileInput.fill('9876543210'); // Replace with valid test mobile
  19  |     }
  20  |     
  21  |     if (await passwordInput.isVisible().catch(() => false)) {
  22  |       await passwordInput.fill('password123'); // Replace with valid test password
  23  |     }
  24  |     
  25  |     // Click login button
  26  |     const loginButton = page.locator('button:has-text("Login"), button:has-text("உள்நுழை"), button[type="submit"]').first();
  27  |     await loginButton.click();
  28  |     
  29  |     // Wait for navigation after login
  30  |     await page.waitForTimeout(3000);
  31  |     await page.screenshot({ path: 'test-results/02-after-login.png' });
  32  |     
  33  |     console.log('Step 2: After login attempt');
  34  |     
  35  |     // Step 3: Navigate to Tax Registration page
  36  |     await page.goto('http://localhost:8080/tax/user-entry');
  37  |     await page.waitForLoadState('networkidle');
  38  |     await page.waitForTimeout(2000);
  39  |     
  40  |     console.log('Step 3: On tax registration page');
  41  |     await page.screenshot({ path: 'test-results/03-tax-page.png' });
  42  |     
  43  |     // Step 4: Verify Gender and Marital Status selectors exist
  44  |     const genderLabel = page.locator('text=Gender').first();
  45  |     const maritalLabel = page.locator('text=Marital Status').first();
  46  |     
> 47  |     await expect(genderLabel).toBeVisible();
      |                               ^ Error: expect(locator).toBeVisible() failed
  48  |     await expect(maritalLabel).toBeVisible();
  49  |     console.log('✅ Gender and Marital Status selectors visible');
  50  |     
  51  |     // Step 5: Select Gender = Male
  52  |     const genderSelect = page.locator('select').filter({ has: page.locator('option[value="male"]') }).first();
  53  |     await genderSelect.selectOption('male');
  54  |     console.log('✅ Selected Gender: Male');
  55  |     await page.screenshot({ path: 'test-results/04-gender-selected.png' });
  56  |     
  57  |     // Step 6: Select Marital Status = Married
  58  |     const maritalSelect = page.locator('select').filter({ has: page.locator('option[value="married"]') }).first();
  59  |     await maritalSelect.selectOption('married');
  60  |     console.log('✅ Selected Marital Status: Married');
  61  |     await page.waitForTimeout(1000);
  62  |     await page.screenshot({ path: 'test-results/05-married-selected.png' });
  63  |     
  64  |     // Step 7: Verify Family Reference section appears
  65  |     const familySection = page.locator('text=Family Reference (Father/Husband)').first();
  66  |     await expect(familySection).toBeVisible({ timeout: 5000 });
  67  |     console.log('✅ Family Reference section visible');
  68  |     
  69  |     // Step 8: Verify Wife Details section appears
  70  |     const wifeNameLabel = page.locator('text=Wife\'s Name').first();
  71  |     await expect(wifeNameLabel).toBeVisible({ timeout: 5000 });
  72  |     console.log('✅ Wife Details section visible');
  73  |     
  74  |     // Step 9: Verify Wife's Father Name field
  75  |     const wifeFatherLabel = page.locator('text=Wife\'s Father Name').first();
  76  |     await expect(wifeFatherLabel).toBeVisible({ timeout: 5000 });
  77  |     console.log('✅ Wife Father Name field visible');
  78  |     
  79  |     // Step 10: Verify Wife Contact field
  80  |     const wifeContactLabel = page.locator('text=Wife Contact').first();
  81  |     await expect(wifeContactLabel).toBeVisible({ timeout: 5000 });
  82  |     console.log('✅ Wife Contact field visible');
  83  |     
  84  |     // Step 11: Verify Separate Tax ID checkbox
  85  |     const separateCheckbox = page.locator('text=Create Separate Tax ID (New Family Branch)').first();
  86  |     await expect(separateCheckbox).toBeVisible({ timeout: 5000 });
  87  |     console.log('✅ Separate Tax ID checkbox visible');
  88  |     
  89  |     await page.screenshot({ path: 'test-results/06-all-family-sections-visible.png' });
  90  |     
  91  |     // Step 12: Fill the form
  92  |     // Fill basic details
  93  |     await page.locator('input[type="tel"]').first().fill('9876543999');
  94  |     
  95  |     // Find and fill name input (look for input near Name label)
  96  |     const nameInput = page.locator('label:has-text("Name") + input, label:has-text("Name") ~ input').first();
  97  |     await nameInput.fill('Test Married Man');
  98  |     
  99  |     // Fill father name
  100 |     const fatherInput = page.locator('label:has-text("Father Name") + input, label:has-text("Father Name") ~ input').first();
  101 |     await fatherInput.fill('Test Father Name');
  102 |     
  103 |     // Fill wife name
  104 |     const wifeNameInput = page.locator('label:has-text("Wife\'s Name") + input, label:has-text("Wife\'s Name") ~ input').first();
  105 |     await wifeNameInput.fill('Test Wife Name');
  106 |     
  107 |     // Fill wife father name
  108 |     const wifeFatherInput = page.locator('label:has-text("Wife\'s Father Name") + input, label:has-text("Wife\'s Father Name") ~ input').first();
  109 |     await wifeFatherInput.fill('Wife Father Name');
  110 |     
  111 |     // Fill address
  112 |     const addressInput = page.locator('textarea, input').filter({ hasText: /Address/ }).first();
  113 |     if (await addressInput.isVisible().catch(() => false)) {
  114 |       await addressInput.fill('123 Test Street, Chennai');
  115 |     }
  116 |     
  117 |     console.log('✅ Form fields filled');
  118 |     await page.screenshot({ path: 'test-results/07-form-filled.png' });
  119 |     
  120 |     // Step 13: Test Family Reference Search
  121 |     // Try to enter a reference number in the family search
  122 |     const familyRefInput = page.locator('input[placeholder*="father" i], input[placeholder*="reference" i]').filter({ has: page.locator('..:has-text("Family")') }).first();
  123 |     if (await familyRefInput.isVisible().catch(() => false)) {
  124 |       await familyRefInput.fill('T-2024-001');
  125 |       console.log('✅ Entered family reference number');
  126 |       
  127 |       // Click search button
  128 |       const searchButton = page.locator('button').filter({ hasText: '🔍' }).first();
  129 |       if (await searchButton.isVisible().catch(() => false)) {
  130 |         await searchButton.click();
  131 |         await page.waitForTimeout(2000);
  132 |         console.log('✅ Clicked family search button');
  133 |         await page.screenshot({ path: 'test-results/08-family-search-clicked.png' });
  134 |       }
  135 |     }
  136 |     
  137 |     console.log('\n=== Family Chain UI Test Complete ===');
  138 |     console.log('All sections verified:');
  139 |     console.log('- ✅ Gender & Marital Status selectors');
  140 |     console.log('- ✅ Family Reference Search (conditional)');
  141 |     console.log('- ✅ Wife Details section (conditional)');
  142 |     console.log('- ✅ Wife Father Name field');
  143 |     console.log('- ✅ Wife Contact field');
  144 |     console.log('- ✅ Separate Tax ID checkbox');
  145 |     console.log('- ✅ Form can be filled');
  146 |   });
  147 |   
```