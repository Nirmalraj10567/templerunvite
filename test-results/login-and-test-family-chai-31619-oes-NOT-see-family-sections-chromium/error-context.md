# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-and-test-family-chain.spec.ts >> Login and Test Family Chain Flow >> should verify unmarried user does NOT see family sections
- Location: e2e/login-and-test-family-chain.spec.ts:148:3

# Error details

```
Error: locator.selectOption: Target page, context or browser has been closed
Call log:
  - waiting for locator('select').first()

```

# Test source

```ts
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
  148 |   test('should verify unmarried user does NOT see family sections', async ({ page }) => {
  149 |     // Navigate to tax page
  150 |     await page.goto('http://localhost:8080/tax/user-entry');
  151 |     await page.waitForLoadState('networkidle');
  152 |     await page.waitForTimeout(2000);
  153 |     
  154 |     // Select Gender = Male
  155 |     const genderSelect = page.locator('select').first();
> 156 |     await genderSelect.selectOption('male');
      |                        ^ Error: locator.selectOption: Target page, context or browser has been closed
  157 |     
  158 |     // Select Marital Status = Unmarried
  159 |     const maritalSelect = page.locator('select').nth(1);
  160 |     await maritalSelect.selectOption('unmarried');
  161 |     
  162 |     await page.waitForTimeout(1000);
  163 |     await page.screenshot({ path: 'test-results/09-unmarried-selected.png' });
  164 |     
  165 |     // Family Reference section should NOT be visible
  166 |     const familySection = page.locator('text=Family Reference (Father/Husband)');
  167 |     await expect(familySection).not.toBeVisible();
  168 |     console.log('✅ Family Reference section hidden for unmarried');
  169 |     
  170 |     // Wife's Name should NOT be visible
  171 |     const wifeNameLabel = page.locator('text=Wife\'s Name');
  172 |     await expect(wifeNameLabel).not.toBeVisible();
  173 |     console.log('✅ Wife Details hidden for unmarried');
  174 |   });
  175 |   
  176 |   test('should verify female married user does NOT see family sections', async ({ page }) => {
  177 |     // Navigate to tax page
  178 |     await page.goto('http://localhost:8080/tax/user-entry');
  179 |     await page.waitForLoadState('networkidle');
  180 |     await page.waitForTimeout(2000);
  181 |     
  182 |     // Select Gender = Female
  183 |     const genderSelect = page.locator('select').first();
  184 |     await genderSelect.selectOption('female');
  185 |     
  186 |     // Select Marital Status = Married
  187 |     const maritalSelect = page.locator('select').nth(1);
  188 |     await maritalSelect.selectOption('married');
  189 |     
  190 |     await page.waitForTimeout(1000);
  191 |     await page.screenshot({ path: 'test-results/10-female-married-selected.png' });
  192 |     
  193 |     // Family Reference section should NOT be visible (per flowchart - only for males)
  194 |     const familySection = page.locator('text=Family Reference (Father/Husband)');
  195 |     await expect(familySection).not.toBeVisible();
  196 |     console.log('✅ Family Reference section hidden for female');
  197 |     
  198 |     // Wife's Name should NOT be visible
  199 |     const wifeNameLabel = page.locator('text=Wife\'s Name');
  200 |     await expect(wifeNameLabel).not.toBeVisible();
  201 |     console.log('✅ Wife Details hidden for female');
  202 |   });
  203 | });
  204 | 
```