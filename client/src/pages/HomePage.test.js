// To render components and simulate user actions
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Wraps components that use react-router
import { BrowserRouter } from 'react-router-dom';

// SUT (component under test)
import HomePage from '../pages/HomePage';

// Supplies cart context so the component can add items to cart
import { CartProvider } from '../context/cart';

import axios from 'axios';
import toast from 'react-hot-toast';

// Mock dependencies
// Mock axios to avoid real HTTP requests; tests provide controlled responses
jest.mock('axios');
// Mock react-hot-toast to assert toast calls; lets tests check that toast.success was called without showing UI
jest.mock('react-hot-toast');

// Mock router navigation
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),

    // react-router-dom overrides useNavigate to a jest.fn so navigation calls won't break tests
    useNavigate: () => jest.fn(),
}));

// Mock auth context to return a default unauthenticated state ([{ user: null, token: '' }, jest.fn()])
jest.mock('../context/auth', () => ({
    useAuth: () => [
        { user: null, token: '' },
        jest.fn(),
    ],
}));

// Mock search context to return no search keyword/results
jest.mock('../context/search', () => ({
    useSearch: () => [
        { keyword: '', results: [] },
        jest.fn(),
    ],
}));

// Mock category hook. Returns an empty array for categories so the component renders without categories
jest.mock('../hooks/useCategory', () => ({
    __esModule: true,
    default: () => [],
}));

// Mock react-icons to avoid rendering issues. Returns a simple span for AiOutlineReload to avoid rendering the real icon
jest.mock('react-icons/ai', () => ({
    AiOutlineReload: () => <span>Reload Icon</span>,
}));

// Mock the Prices component. Instead of a component, a static Prices array is mocked so filtering UI relying on price buckets can work predictably
jest.mock('../components/Prices', () => ({
    Prices: [
        { _id: '0', name: '$0 to $19', array: [0, 19] },
        { _id: '1', name: '$20 to $39', array: [20, 39] },
        { _id: '2', name: '$40 to $59', array: [40, 59] },
        { _id: '3', name: '$60 to $79', array: [60, 79] },
        { _id: '4', name: '$80 to $99', array: [80, 99] },
        { _id: '5', name: '$100 or more', array: [100, 9999] },
    ],
}));

// Test data - 3 product objects 
const mockProducts = [
    { _id: 1, name: 'Product A', price: 50, description: 'Description A', slug: 'product-a' },
    { _id: 2, name: 'Product B', price: 100, description: 'Description B', slug: 'product-b' },
    { _id: 3, name: 'Product C', price: 0, description: 'Description C', slug: 'product-c' },
];

// Helper function to render a component in BrowserRouter and CartProvider so HomePage has the same provider environment it expects in the app

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <CartProvider>
                {component}
            </CartProvider>
        </BrowserRouter>
    );
};

// Helper function to wait for products to be rendered
// The test explicitly waits because the buttons are rendered only after several async operations complete (axios calls, state updates, re-render). Without waiting, the test may run assertions before the DOM is updated and fail intermittently
// The mocked API returns a product list async, so when HomePage is first rendered, there are no "ADD TO CART" buttons yet. waitForProducts uses waitFor to poll the DOM until at least one such button appears, guaranteeing that the async load and rendering have completed before the test interacts with the button
// The helper function checks for `buttons.length > 0` because there is a button for each product. The component renders one button for each product in the products array. The mocked data in the test includes 3 products, so multiple buttons are expected.

// queryAllByText returns an array (possibly empty) and does not throw when nothing is found. This is convenient in waitFor where it checks a condition repeatedly
// getAllByText throws immediately if nothing is found,so it's used only after the test has waited and guaranteed the elements are present
const waitForProducts = async () => {
    await waitFor(() => {
        const buttons = screen.queryAllByText('ADD TO CART');
        expect(buttons.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
};

describe('Add to Cart Functionality', () => {

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();       // Ensure no leftover cart data between tests
        jest.clearAllMocks();       // Resets call history for all mocked functions

        // Mock successful API responses - Returns different mocked responses depending on the requested URL
        // Ensures HomePage receives predictable data when it calls axios.get
        axios.get.mockImplementation((url) => {
            if (url.includes('/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: [] } });
            }
            if (url.includes('/product/product-count')) {
                return Promise.resolve({ data: { total: 10 } });
            }
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.resolve({ data: {} });       // returns empty object by default
        });
    });

    // ============================================
    // 1. EQUIVALENCE PARTITIONING TESTS
    // ============================================

    describe('Equivalence Partitioning', () => {

        test('Add single product to empty cart (Valid partition)', async () => {
            
            // Render HomePage with router and CartProvider
            renderWithProviders(<HomePage />);

            // Wait until product list is rendered (ensures the async axios mock has been processed and buttons appear)
            await waitForProducts();
            
            // Select all visible "ADD TO CART" buttons
            const addToCartButtons = screen.getAllByText('ADD TO CART');

            // Simulate clicking the first product's add to cart button
            fireEvent.click(addToCartButtons[0]);

            // Read cart state from localStorage
            const cart = JSON.parse(localStorage.getItem('cart'));

            // Cart should have exactly one item after the click
            expect(cart).toHaveLength(1);

            // The stored id should have id = 1
            expect(cart[0]._id).toBe(1);

            // The toast.success should have been called with the expected message
            expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
        });

        test('Add product to cart with existing items', async () => {
            // Arrange
            const existingCart = [mockProducts[0]];
            localStorage.setItem('cart', JSON.stringify(existingCart));
            renderWithProviders(<HomePage />);
            await waitForProducts();
            
            // Act
            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[1]);

            // Assert
            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);
            expect(cart[1]._id).toBe(2);
        });

        // Adding duplicates just increases the quantity by 1
        test('Add duplicate product to cart - duplicates allowed', async () => {
            const existingCart = [mockProducts[0]];
            localStorage.setItem('cart', JSON.stringify(existingCart));
            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);       // Same product

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);
            expect(cart.filter(item => item._id === 1)).toHaveLength(2);
        });

        test('Add product with price = 0', async () => {
            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[2]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(1);
            expect(cart[0].price).toBe(0);
        });

    });

    describe('Boundary Value Analysis', () => {

        test('Add product to cart with 0 items', async () => {
            renderWithProviders(<HomePage />);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toBeNull();

            await waitForProducts();
            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            const updatedCart = JSON.parse(localStorage.getItem('cart'));
            expect(updatedCart).toHaveLength(1);
        });

        test('Add product to cart with 1 item', async () => {
            localStorage.setItem('cart', JSON.stringify([mockProducts[0]]));
            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[1]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);
        });

        test('Add product to cart with 2 items', async () => {
            localStorage.setItem('cart', JSON.stringify([mockProducts[0], mockProducts[1]]));
            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[2]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(3);
        });

    });

    test('Add product to cart with maximum number of items realistically', async () => {
        const largeCart = Array(99).fill(mockProducts[0]);
        localStorage.setItem('cart', JSON.stringify(largeCart));
        
        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[1]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart).toHaveLength(100);
    });

    test('Product price at boundary (price = 0.01)', async () => {
        const productWithMinPrice = { ...mockProducts[0], price: 0.01 };
        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [productWithMinPrice] } });
            }
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart[0].price).toBe(0.01);
    });

    test('Product price at high boundary (price = 9999999', async () => {
        const productWithMaxPrice = { ...mockProducts[0], price: 999999 };
        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [productWithMaxPrice] } });
            }
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart[0].price).toBe(999999);
    });

    describe('Cart States', () => {
        test('transition from empty cart → cart that contains items', async () => {
            expect(localStorage.getItem('cart')).toBeNull();

            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(1);
        });

        test('remains in cart containing items state (adding more items)', async () => {
            localStorage.setItem('cart', JSON.stringify([mockProducts[0]]));

            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[1]);

            // state: cart contains 2 items
            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);
        });

        test('multiple rapid state transitions', async () => {
            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');

            // empty → cart contains items
            fireEvent.click(addToCartButtons[0]);
            let cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(1);

            // cart contains items → cart contains items
            fireEvent.click(addToCartButtons[1]);
            cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);

            // cart contains items → cart contains items
            fireEvent.click(addToCartButtons[2]);
            cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(3);

        });

    });

    test('add product to empty cart', async () => {
        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart).toHaveLength(1);
        expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
    });

    test('add product to non-empty cart', async () => {
        localStorage.setItem('cart', JSON.stringify([mockProducts[0]]));
        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[1]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart).toHaveLength(2);
        expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
    });

    test('product with all required fields', async () => {
        const completeProduct = {
            _id: '4',
            name: 'Complete Product',
            price: 75,
            description: 'Full description',
            slug: 'complete-product'
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [completeProduct] } });
            }
            return Promise.resolve({ data: { success: true, category: [], total: 1} });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart[0]).toMatchObject(completeProduct);
    });

    test('product with minimal required fields', async () => {
        const minimalProduct = {
            _id: '5',
            name: 'Minimal',
            price: 10,
            description: 'Min',
            slug: 'minimal'
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [minimalProduct] }});
            }
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart).toHaveLength(1);
    });

    describe('Pairwise Testing', () => {
        test('empty cart + low price + category A', async () => {
            const product = { ...mockProducts[0], price: 10, category: 'A' };
            axios.get.mockImplementation((url) => {
                if (url.includes('/product/product-list')) {
                    return Promise.resolve({ data: { products: [product] } });
                }
                return Promise.resolve({ data: { success: true, category: [], total: 1 } });
            });

            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart[0].price).toBe(10);
            expect(cart[0].category).toBe('A');
        });

        test('cart has items + high price + category B', async () => {
            localStorage.setItem('cart', JSON.stringify([mockProducts[0]]));
            const product = { ...mockProducts[1], price: 500, category: 'B' };

            axios.get.mockImplementation((url) => {
                if (url.includes('/product/product-list')) {
                    return Promise.resolve({ data: { products: [product] } });
                }
                return Promise.resolve({ data: { success: true, category: [], total: 1 } });
            });

            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);
            expect(cart[1].price).toBe(500);
        });

        test('empty cart + medium range price + category B', async () => {
            const product = { ...mockProducts[0], price: 100, category: 'B' };

            axios.get.mockImplementation((url) => {
                if (url.includes('/product/product-list')) {
                    return Promise.resolve({ data: { products: [product] } });
                }
                return Promise.resolve({ data: { success: true, category: [], total: 1 } });
            });

            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart[0].price).toBe(100);
            expect(cart[0].category).toBe('B');

        });

        test('non-empty cart + low price + category A', async () => {
            localStorage.setItem('cart', JSON.stringify([mockProducts[1]]));
            const product = { ...mockProducts[0], price: 15, category: 'A' };

            axios.get.mockImplementation((url) => {
                if (url.includes('/product/product-list')) {
                    return Promise.resolve({ data: { products: [product] } });
                }
                return Promise.resolve({ data: { success: true, category: [], total: 1 } });
            });

            renderWithProviders(<HomePage />);
            await waitForProducts();

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            const cart = JSON.parse(localStorage.getItem('cart'));
            expect(cart).toHaveLength(2);
        });
    });

    test('localStorage persistence verification', async () => {
        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const storedCart = localStorage.getItem('cart');
        expect(storedCart).toBeTruthy();

        const parsedCart = JSON.parse(storedCart);
        expect(parsedCart).toBeInstanceOf(Array);
        expect(parsedCart[0]._id).toBe(1);
    });

    test('toast notification triggers correctly', async () => {
        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
    });

    test('multiple sequential additions', async () => {
        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');

        fireEvent.click(addToCartButtons[0]);
        fireEvent.click(addToCartButtons[1]);
        fireEvent.click(addToCartButtons[2]);
        
        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart).toHaveLength(3);
        expect(toast.success).toHaveBeenCalledTimes(3);
    });

    test('product with empty string description', async () => {
        const productNoDesc = { ...mockProducts[0], description: '' };

        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [productNoDesc] } });
            };
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);
    });

    test('product with special characters in name', async () => {
        const specialProduct = { ...mockProducts[0], name: "Product with 'quotes' & symbols!@#"};

        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [specialProduct] } });
            };
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart[0].name).toBe("Product with 'quotes' & symbols!@#");
    });

    test('very long product name (1000 chars)', async () => {
        const longName = 'A'.repeat(1000);
        const longProduct = { ...mockProducts[0], name: longName }

        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [longProduct] } });
            };
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart[0].name).toHaveLength(1000);
    });

    test('floating point price precision', async () => {
        const precisePrice = { ...mockProducts[0], price: 19.999999999 };

        axios.get.mockImplementation((url) => {
            if (url.includes('/product/product-list')) {
                return Promise.resolve({ data: { products: [precisePrice] } });
            };
            return Promise.resolve({ data: { success: true, category: [], total: 1 } });
        });

        renderWithProviders(<HomePage />);
        await waitForProducts();

        const addToCartButtons = screen.getAllByText('ADD TO CART');
        fireEvent.click(addToCartButtons[0]);

        const cart = JSON.parse(localStorage.getItem('cart'));
        expect(cart[0].price).toBe(19.999999999);
    });

});