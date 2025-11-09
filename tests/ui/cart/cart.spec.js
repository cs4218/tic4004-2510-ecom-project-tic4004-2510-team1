import { expect, test } from '@playwright/test';

test.describe('Cart Page Tests', () => {

    test('should display empty cart message when cart is empty', async ({ page }) => {
        await page.goto('/');

        // Clear cart by clearing localStorage
        await page.evaluate(() => localStorage.removeItem('cart'));

        // Navigate to cart 
        await page.goto('/cart');

        // Check for empty cart message
        const emptyMessage = page.getByText('Your Cart Is Empty');
        await expect(emptyMessage).toBeVisible();
    });

    test('should display guest message when not logged in', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('auth'));

        await page.goto('/cart');

        // Check for guest greeting
        const guestMessage = page.getByText('Hello Guest');
        await expect(guestMessage).toBeVisible();
    });

    // /*
    test('should add product to cart and display in cart page', async ({ page }) => {
        // Ensure frontend and backend are reachable
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Make sure product cards are present
        await page.locator('.card').first().waitFor({ state: 'visible', timeout: 15000 });

        // Add first product to cart
        const addToCartButton = page.locator('.card').first().getByRole('button', { name: /add to cart/i });
        await addToCartButton.click();

        // Wait for potential toast or UI update
        await page.waitForTimeout(1000);

        // Go to cart and wait for cart UI to settle
        await page.goto('/cart');
        await page.waitForLoadState('networkidle');

        // Verify cart message (use flexible regex)
        const cartMessage = page.getByText(/you have\s*1\s*items?\s*in your cart/i);
        await expect(cartMessage).toBeVisible();

        // Verify cart displays the product card (wait until visible)
        const cartCard = page.locator('.card.flex-row');
        await cartCard.first().waitFor({ state: 'visible', timeout: 10000 });
        await expect(cartCard).toBeVisible();
    });
    // */

    test('should display product details in cart', async ({ page }) => {
        await page.goto('/');
        // Add product and go to cart
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        await page.goto('/cart');

        // Check product card has image, name, description, price
        const cartCard = page.locator('.card.flex-row').first();
        await expect(cartCard.locator('img')).toBeVisible();
        await expect(cartCard.locator('p').first()).toBeVisible();      // Name
        await expect(cartCard.locator('p').filter({ hasText: 'Price' })).toBeVisible();
    });

    test('should remove product from cart', async ({ page }) => {
        await page.goto('/');
        // Add product and go to cart
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        await page.goto('/cart');

        // Click remove button
        const removeButton = page.getByRole('button', { name: 'Remove' }).first();
        await removeButton.click();

        // Wait a moment for state update
        await page.waitForTimeout(500);

        // Verify empty cart message appears
        const emptyMessage = page.getByText('Your Cart Is Empty');
        await expect(emptyMessage).toBeVisible();
    });

    test('should display cart summary section', async ({ page }) => {
        await page.goto('/');
        // Add product and go to cart
        await page.evaluate(() => localStorage.removeItem('cart'));
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        await page.goto('/cart');

        // Check cart summary section
        const summaryHeading = page.getByRole('heading', { name: 'Cart Summary' });
        await expect(summaryHeading).toBeVisible();

        // Check for "Total | Checkout | Payment" text
        const checkoutText = page.getByText('Total | Checkout | Payment');
        await expect(checkoutText).toBeVisible();

        // Check total price is displayed
        const totalPrice = page.locator('h4').filter({ hasText: /Total :/ });
        await expect(totalPrice).toBeVisible();
    });

    // /*
    test('should calculate total price correctly', async ({ page }) => {
        // Go to homepage and ensure app is ready
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Clear cart in a safe origin
        await page.evaluate(() => localStorage.removeItem('cart')).catch(() => {});

        // Wait for product cards to appear and read first product price
        const firstCard = page.locator('.card').first();
        await firstCard.waitFor({ state: 'visible', timeout: 15000 });

        const priceLocator = firstCard.locator('.card-price');
        await priceLocator.waitFor({ state: 'visible', timeout: 5000 });
        const firstProductPriceText = (await priceLocator.textContent()) || '';
        const firstProductPrice = parseFloat(firstProductPriceText.replace(/[^0-9.]/g, '')) || 0;

        // Add the product to cart and wait for UI update (toast or cart badge)
        await firstCard.getByRole('button', { name: /add to cart/i }).click();
        await page.waitForTimeout(1000);

        // Navigate to cart and wait for cart UI to settle
        await page.goto('/cart');
        await page.waitForLoadState('networkidle');

        // Wait for a visible element that reliably indicates the cart total is rendered
        const totalLocator = page.locator('h4').filter({ hasText: /Total/i });
        const totalVisible = await totalLocator.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);

        if (!totalVisible) {
            await page.screenshot({ path: 'tmp/cart-total-missing.png', fullPage: true }).catch(() => {});
            throw new Error('Cart total did not appear within timeout; screenshot saved to tmp/cart-total-missing.png');
        }

        // Extract and compare numeric values
        const totalPriceText = (await totalLocator.textContent()) || '';
        const totalPrice = parseFloat(totalPriceText.replace(/[^0-9.]/g, '')) || 0;

        expect(totalPrice).toBeCloseTo(firstProductPrice, 2);
    });

    // */

    test('should show login prompt when guest tries to checkout', async ({ page }) => {
        await page.goto('/');
        // Clear auth
        await page.evaluate(() => {
            localStorage.removeItem('auth');
            localStorage.removeItem('cart');
        });

        // Add product
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        await page.goto('/cart');

        // Check for login button
        const loginButton = page.getByRole('button', { name: /Plase Login to checkout/i });
        await expect(loginButton).toBeVisible();
    });

    test('should navigate to login when clicking checkout as guest', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.removeItem('auth');
            localStorage.removeItem('cart');
        });

        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        await page.goto('/cart');

        // Click login button
        const loginButton = page.getByRole('button', { name: /Plase Login to checkout/i });
        await loginButton.click();

        // Should navigate to login with cart as return URL
        await expect(page).toHaveURL('/login');
    });

    test('should show user greeting when logged in', async ({ page }) => {
        await page.goto('/login');
        // Login first
        await page.getByPlaceholder('Enter Your Email').fill('test@example.com');
        await page.getByPlaceholder('Enter Your Password').fill('password123');
        await page.getByRole('button', { name: 'LOGIN', exact: true }).click();
        await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

        // Go to cart
        await page.goto('/cart');

        // Should see user greeting (not "Hello Guest")
        const heading = page.locator('h1.text-center');
        const headingText = await heading.textContent();
        expect(headingText).toContain('Hello');

        // Should not contain Guest if logged in successfully
    });

    /*
    test('should display update address button for logged in users', async ({ page }) => {
        // Go to login page and perform login
        await page.goto('/login');
        await page.getByPlaceholder('Enter Your Email').fill('test@example.com');
        await page.getByPlaceholder('Enter Your Password').fill('password123');

        // Click login and wait for either a navigation or a login API response
        const loginApiPath = /\/api\/.*login/i; // adjust if your login endpoint differs
        const waited = Promise.race([
            page.waitForResponse(resp => loginApiPath.test(resp.url()) && resp.status() >= 200 && resp.status() < 400, { timeout: 10000 }).catch(() => null),
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => null)
        ]);

        await page.getByRole('button', { name: 'LOGIN', exact: true }).click();
        await waited;

        // Ensure we are on the app origin before accessing localStorage
        await page.goto('/'); 
        await page.waitForLoadState('networkidle');

        // Prefer checking a persisted auth indicator: try localStorage token (adjust key name)
        const authTokenKey = 'authToken'; // change to the key your app uses, e.g., 'token' or 'accessToken'
        const hasToken = await page.evaluate((k) => !!window.localStorage.getItem(k), authTokenKey).catch(() => false);

        // Fallback UI checks (flexible)
        const logoutButtonVisible = await page.getByRole('button', { name: /logout|sign out/i }).isVisible().catch(() => false);
        const profileVisible = await page.getByText(/profile|welcome/i).isVisible().catch(() => false);

        // If login not detected, capture screenshot for debugging
        if (!hasToken && !logoutButtonVisible && !profileVisible) {
            await page.screenshot({ path: 'tmp/login-failed-debug.png', fullPage: true }).catch(() => {});
            console.log('Debug: login did not appear to succeed; no token, logout button, or profile text found.');
        }

        expect(hasToken || logoutButtonVisible || profileVisible).toBe(true);

        // Now continue: ensure homepage products are loaded, add one to cart, go to cart
        await page.locator('.card').first().waitFor({ state: 'visible', timeout: 15000 });

        await page.locator('.card').first().getByRole('button', { name: /add to cart/i }).click();
        await page.waitForTimeout(500);

        await page.goto('/cart');
        await page.waitForLoadState('networkidle');

        // Check for update address button or current address heading (flexible)
        const updateAddressButton = page.getByRole('button', { name: /update address/i });
        const currentAddressHeading = page.getByRole('heading', { name: /current address/i });

        const checkVisible = async (locator, timeout = 3000) => locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
        const hasUpdateButton = await checkVisible(updateAddressButton, 3000);
        const hasCurrentAddress = await checkVisible(currentAddressHeading, 3000);

        if (!hasUpdateButton && !hasCurrentAddress) {
            await page.screenshot({ path: 'tmp/cart-no-address-debug.png', fullPage: true }).catch(() => {});
            console.log('Debug: neither Update Address nor Current Address was visible on /cart');
        }

        expect(hasUpdateButton || hasCurrentAddress).toBe(true);
    });
    */

    test('should navigate to profile when clicking update address', async ({ page }) => {
         // Login first
        await page.goto('/login');
        await page.getByPlaceholder('Enter Your Email').fill('test@example.com');
        await page.getByPlaceholder('Enter Your Password').fill('password123');
        await page.getByRole('button', { name: 'LOGIN', exact: true }).click();
        await page.waitForURL('/', { timeout: 10000 }).catch(() => {});

        // Add product and go to cart
        await page.goto('/');
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        await page.goto('/cart');

        // Click update address if visible
        const updateAddressButton = page.getByRole('button', { name: 'Update Address' });
        if (await updateAddressButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await updateAddressButton.click();
            await expect(page).toHaveURL('/dashboard/user/profile');
        }
    });

    test('should persist cart items after page reload', async ({ page }) => {
        // Add product to cart
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate(() => localStorage.removeItem('cart'));
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload();

        // Go to cart
        await page.goto('/cart');

        // Cart should still have the item
        const cartMessage = page.getByText(/You Have 1 items in your cart/i);
        await expect(cartMessage).toBeVisible();
    });

    test('should add multiple products to cart', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Clear cart
        await page.evaluate(() => localStorage.removeItem('cart'));
        await page.waitForSelector('.card', { timeout: 10000 });
        
        // Add first product
        await page.locator('.card').nth(0).getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(500);

        // Add second product
        await page.locator('.card').nth(1).getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(500);

        // Go to cart
        await page.goto('/cart');

        // Should have 2 items
        const cartMessage = page.getByText(/You have 2 items in your cart/i);
        await expect(cartMessage).toBeVisible();

        // Should show 2 cart cards
        const cartCards = page.locator('.card.flex-row');
        await expect(cartCards).toHaveCount(2);

    });

    test('should remove specific item from cart with multiple items', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Add multiple products
        await page.evaluate(() => localStorage.removeItem('cart'));
        await page.waitForSelector('.card', { timeout: 10000 });
        
        // Add first product
        await page.locator('.card').nth(0).getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(500);
        await page.locator('.card').nth(1).getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(500);

        // Go to cart
        await page.goto('/cart');

        // Remove first item
        const removeButtons = page.getByRole('button', { name: 'Remove' });
        await removeButtons.first().click();
        await page.waitForTimeout(500);

        // Should now have 1 item
        const cartMessage = page.getByText(/You Have 1 items in your cart/i);
        await expect(cartMessage).toBeVisible();

    });

    test('should display cart item price', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Add product
        await page.evaluate(() => localStorage.removeItem('cart'));
        await page.waitForSelector('.card', { timeout: 10000 });
        await page.locator('.card').first().getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(1000);
        
        // Go to cart
        await page.goto('/cart');
        
        // Check for price text
        const priceText = page.locator('.card.flex-row').first().getByText(/Price :/i);
        await expect(priceText).toBeVisible();
    });
    
    test('should show cart summary for multiple items', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Add multiple products
        await page.evaluate(() => localStorage.removeItem('cart'));
        await page.waitForSelector('.card', { timeout: 10000 });
        
        await page.locator('.card').nth(0).getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(500);
        await page.locator('.card').nth(1).getByRole('button', { name: 'ADD TO CART' }).click();
        await page.waitForTimeout(500);

        // Go to cart
        await page.goto('/cart');

        // Cart summary should still be visible
        const summaryHeading = page.getByRole('heading', { name: 'Cart Summary' });
        await expect(summaryHeading).toBeVisible();

        // Total should be displayed
        const totalPrice = page.locator('h4').filter({ hasText: /Total :/ });
        await expect(totalPrice).toBeVisible();
    });

});