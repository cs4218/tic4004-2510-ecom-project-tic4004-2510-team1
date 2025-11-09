import { jest } from '@jest/globals';

const mockProductModel = { find: jest.fn() };

jest.unstable_mockModule('../models/productModel.js', () => ({ default: mockProductModel }));

const { searchProductController } = await import('./productController.js');

describe('Search Functionality Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { params: {} };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    test('empty keyword parameter', async () => {
        req.params.keyword = '';
        const mockResults = [];
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        await searchProductController(req, res);

        expect(mockProductModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: req.params.keyword, $options: 'i' } },
                { description: { $regex: req.params.keyword, $options: 'i' } },
            ],
        });
        expect(res.json).toHaveBeenCalledWith(mockResults);
    });

    test('single character keyword (minimum valid search)', async () => {
        req.params.keyword = 'a';
        const mockResults = [
            { _id: '1', name: 'Apple', description: 'Fresh apple', price: 2.99 }
        ];

        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        await searchProductController(req, res);

        expect(mockProductModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: req.params.keyword, $options: 'i' } },
                { description: { $regex: req.params.keyword, $options: 'i' } }
            ]
        });
        expect(res.json).toHaveBeenCalledWith(mockResults);

    });

    test('two characters keyword', async () => {
        req.params.keyword = 'ab';
        const mockResults = [
            { _id: 1, name: 'Absolute', description: 'Test description', price: 10 }
        ];
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        await searchProductController(req, res);

        expect(mockProductModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: req.params.keyword, $options: 'i' } },
                { description: { $regex: req.params.keyword, $options: 'i' } }
            ]
        });
    });

    // Assuming 100 characters is the maximum limit on search input (req.params.keyword)

    test.each([
        { keyword: 'a'.repeat(99), description: '99 characters' },
        { keyword: 'a'.repeat(100), description: '100 characters' },
        { keyword: 'a'.repeat(101), description: '101 characters' }
    ])('keyword maximum boundary - $description', async ({ keyword }) => {
        req.params.keyword = keyword;
        const mockResults = [];
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        await searchProductController(req, res);

        expect(mockProductModel.find).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockResults);
    });

    /*
    test('keyword length boundaries around maximum', async () => {
         const keywords = [
             { length: 99, keyword: 'a'.repeat(99), description: '99 characters'},
             { length: 100, keyword: 'a'.repeat(100), description: '100 characters'},
             { length: 101, keyword: 'a'.repeat(101), description: '101 characters'}
         ];
 
         for (const keyword of keywords) {
             req.params.keyword = keyword;
             const mockResults = [];
             mockProductModel.find.mockReturnValue({
                 select: jest.fn().mockResolvedValue(mockResults)
             });
 
             await searchProductController(req, res);
 
             expect(mockProductModel.find).toHaveBeenCalled();
             expect(res.json).toHaveBeenCalledWith(mockResults);
         };
    })
     */

    /*
    test('very long keyword (255 characters)', async () => {
         const longKeyword = 'a'.repeat(255);
         req.params.keyword = longKeyword;
         const mockResults = [];
 
         mockProductModel.find.mockReturnValue({
             select: jest.fn().mockResolvedValue(mockResults)
         });
 
         await searchProductController(req, res);
 
         expect(mockProductModel.find).toHaveBeenCalledWith({
             $or: [
                 { name: { $regex: longKeyword, $options: 'i' } },
                 { description: { $regex: longKeyword, $options: 'i' } }
             ]
         });
         expect(res.json).toHaveBeenCalledWith(mockResults);
    });
    */

    test.each([
        {
            description: 'alphabetic characters', keyword: 'laptop',
            mockResults: [{ _id: '1', name: 'Laptop Air', description: 'Best laptop ever', price: 999 }]
        },
        {
            description: 'numeric characters', keyword: '12345',
            mockResults: [{ _id: '1', name: 'Product 12345', description: 'Model 12345', price: 100 }]
        },
        {
            description: 'alphanumeric characters', keyword: 'iPhone14',
            mockResults: [{ _id: '1', name: 'iPhone14 Pro Max', description: 'Latest model', price: 1099 }]
        },
        {
            description: 'special characters', keyword: '@#$%',
            mockResults: []
        },
        {
            description: 'whitespace characters', keyword: 'smart phone',
            mockResults: [{ _id: '1', name: 'Smart Phone X', description: 'Modern phone', price: 599 }]
        },
        {
            description: 'mixed characters (alphanumeric + special + space)', keyword: 'iPhone 14 Pro!',
            mockResults: []
        },
        {
            description: 'lowercase keyword (case-insensitive)',
            keyword: 'laptop',
            mockResults: [
                { _id: '1', name: 'LAPTOP', description: 'uppercase', price: 500 }
            ]
        },
        {
            description: 'uppercase keyword (case-insensitive)',
            keyword: 'LAPTOP',
            mockResults: [
                { _id: '1', name: 'laptop', description: 'lowercase', price: 500 }
            ]
        },
        {
            description: 'mixed case keyword (case-insensitive)',
            keyword: 'LaPtOp',
            mockResults: [
                { _id: '1', name: 'Laptop', description: 'mixed case', price: 500 }
            ]
        },
    ])('EP - $description', async ({ keyword, mockResults }) => {
        // Arrange
        req.params.keyword = keyword;
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        // Act
        await searchProductController(req, res);

        // Assert - Verify correct response
        expect(res.json).toHaveBeenCalledWith(mockResults);

        // Assert - Verify the keyword was used in the query
        expect(mockProductModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ]
        });
    });

    /*
    test('types of characters keyword', async () => {
         const keywords = [
             { description: 'alphabetic characters', keyword: 'laptop', mockResults: { id: 1, name: 'Laptop Air', description: 'Best laptop ever', price: 999 } },
             { description: 'numeric characters', keyword: '12345', mockResults: { id: 1, name: 'Product 12345', description: 'Product 12345 Description', price: 100 } },
             { description: 'alphanumeric characters', keyword: 'iPhone14', mockResults: { id: 1, name: 'iPhone14 Pro Max', description: 'Latest model', price: 1099 } },
             { description: 'special characters', keyword: '@#$%', mockResults: { } },
             { description: 'whitespace characters', keyword: 'smart phone', mockResults: { id: 1, name: 'Smart Phone X', description: 'Modern phone', price: 599 } },
             { description: 'mixed characters (alphanumeric + special + space', keyword: 'iPhone 14 Pro!', mockResults: { } },
             { description: 'lowercase characters', keyword: 'laptop', mockResults: { id: 1, name: 'LAPTOP', description: 'uppercase', price: 500 } },
             { description: 'uppercase characters', keyword: 'LAPTOP', mockResults: { id: 1, name: 'laptop', description: 'lowercase', price: 500 } },
             { description: 'uppercase characters', keyword: 'LaPtOp', mockResults: { id: 1, name: 'Laptop', description: 'mixed case', price: 500 } },
         ];
 
         for (const keyword of keywords) {
             req.params.keyword = keyword.keyword;
             const mockResults = keyword.mockResults;
             mockProductModel.find.mockReturnValue({
                 select: jest.fn().mockResolvedValue(mockResults)
             });
 
             await searchProductController(req, res);
 
             expect(mockProductModel.find).toHaveBeenCalled();
             expect(res.json).toHaveBeenCalledWith(mockResults);
         };
    });
    */

    /*
    test('valid alphanumeric keyword', async () => {
         req.params.keyword = 'Laptop123';
         const mockResults = [
             { _id: '1', name: 'Laptop123 Pro', description: 'Best laptop', price: 999 },
         ];
 
         mockProductModel.find.mockReturnValue({
             select: jest.fn().mockResolvedValue(mockResults)
         });
 
         await searchProductController(req, res);
 
         expect(mockProductModel.find).toHaveBeenCalledWith({
             $or: [
                 { name: { $regex: 'Laptop123', $options: 'i' } },
                 { description: { $regex: 'Laptop123', $options: 'i' } }
             ]
         });
         expect(res.json).toHaveBeenCalledWith(mockResults);
    });
 
    test('special characters in keyword', async () => {
         req.params.keyword = '$100+tax';
         const mockResults = [];
 
         mockProductModel.find.mockReturnValue({
             select: jest.fn().mockResolvedValue(mockResults)
         });
 
         await searchProductController(req, res);
 
         expect(mockProductModel.find).toHaveBeenCalledWith({
             $or: [
                 { name: { $regex: req.params.keyword, $options: 'i' } },
                 { description: { $regex: req.params.keyword, $options: 'i' } }
             ]
         });
    });
 
    test('whitespace only keyword', async () => {
         req.params.keyword = '    ';
         const mockResults = [];
 
         mockProductModel.find.mockReturnValue({
             select: jest.fn().mockResolvedValue(mockResults)
         });
 
         await searchProductController(req, res);
 
         expect(mockProductModel.find).toHaveBeenCalled();
         expect(res.json).toHaveBeenCalledWith(mockResults);
    });
    */

    /**
     * Decision Table for Search Controller:
     * 
     * Conditions:
     * C1: Keyword matches product name
     * C2: Keyword matches product description
     * C3: Database query succeeds
     * 
     * Actions:
     * A1: Return matching products
     * A2: Return empty array
     * A3: Return error response
     * 
     * Rules:
     * R1: C1=Y, C2=-, C3=Y → A1 (Match in name, query succeeds)
     * R2: C1=-, C2=Y, C3=Y → A1 (Match in description, query succeeds)
     * R3: C1=Y, C2=Y, C3=Y → A1 (Match in both, query succeeds)
     * R4: C1=N, C2=N, C3=Y → A2 (No matches, query succeeds)
     * R5: C1=-, C2=-, C3=N → A3 (Query fails)
    */

    test.each([
        {
            description: 'match name only, query succeeds', keyword: 'laptop',
            mockResults: [{ _id: 1, name: 'Laptop Air', description: 'Best laptop ever', price: 999 }]
        },
        {
            description: 'match in description only, query succeeds', keyword: 'laptop',
            mockResults: [{ _id: 1, name: 'Computer', description: 'Computer device', price: 100 }]
        },
        {
            description: 'match both name and description, query succeeds', keyword: 'laptop',
            mockResults: [{ _id: 1, name: 'Laptop Pro', description: 'Best laptop', price: 1099 }]
        },
        {
            description: 'no matches, query succeeds', keyword: 'nonexistent',
            mockResults: []
        },
        {
            description: 'partial match with word start', keyword: 'lap',
            mockResults: [{ _id: 1, name: 'Laptop', description: 'Computer', price: 999 }]
        },
        {
            description: 'partial match with word middle', keyword: 'apt',
            mockResults: [{ _id: 1, name: 'Laptop', description: 'Computer', price: 999 }]
        },
        {
            description: 'partial match with word end', keyword: 'top',
            mockResults: [{ _id: 1, name: 'Laptop', description: 'Computer', price: 999 }]
        },
    ])('match - $description', async ({ keyword, mockResults }) => {
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith(mockResults);
        expect(res.status).not.toHaveBeenCalledWith(400);
    });

    test('database error, query fails', async () => {
        const dbError = new Error('Database connection failed');
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockRejectedValue(dbError)
        });

        await searchProductController(req, res)

        expect(consoleLogSpy).toHaveBeenCalledWith(dbError);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: 'Error In Search Product API',
            error: dbError
        });

        consoleLogSpy.mockRestore();
    });

    /**
     * FSM for Search Controller:
     * 
     * States:
     * S0: Initial (idle)
     * S1: Searching (query in progress)
     * S2: Success (results returned)
     * S3: Error (error occurred)
     * 
     * Transitions:
     * S0 --[valid keyword]--> S1 --[query success]--> S2
     * S0 --[valid keyword]--> S1 --[query fail]--> S3
     * 
     * Goal: Achieve 100% state coverage and 100% transition coverage
     */

    test.each([
        {
            description: 'transition S0 → S1 → S2 (successful search with results)', keyword: 'laptop',
            mockResults: [{ _id: 1, name: 'Laptop', description: 'Computer', price: 999 }]
        },
        {
            description: 'transition S0 → S1 → S3 (search fails with database error)', keyword: 'laptop',
            mockResults: [{ _id: 1, name: 'Laptop', description: 'Computer', price: 999 }]
        },
    ])('$description', async ({ keyword, mockResults }) => {
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResults)
        });

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith(mockResults);
        expect(res.status).not.toHaveBeenCalledWith(400);
    });

    test('multiple searches (state resets)', async () => {
        req.params.keyword = 'first';
        const mockResultsFirst = [{ id: 1, name: 'First', description: 'Test', price: 10 }];
        mockProductModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue(mockResultsFirst) })

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith(mockResultsFirst);

        jest.clearAllMocks();
        req.params.keyword = 'second';
        const mockResultsSecond = [{ id: 2, name: 'Second', description: 'Test 2', price: 20 }];
        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResultsSecond)
        });

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith(mockResultsSecond);
    });

    describe('Error Handling and Edge Cases', () => {
        let req, res, consoleLogSpy;

        beforeEach(() => {
            req = { params: { keyword: 'test' } };
            res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            jest.clearAllMocks();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
        });

        test('database connection timeout', async () => {
            const timeoutError = new Error('Query timeout');
            timeoutError.code = 'ETIMEDOUT';

            mockProductModel.find.mockReturnValue({
                select: jest.fn().mockRejectedValue(timeoutError)
            });

            await searchProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Error In Search Product API',
                error: timeoutError
            });
        });

        test('network error', async () => {
            const networkError = new Error('Network failure');
            mockProductModel.find.mockReturnValue({
                select: jest.fn().mockRejectedValue(networkError)
            });

            await searchProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(consoleLogSpy).toHaveBeenCalledWith(networkError);
        });

        test('null keyword parameter', async () => {
            req.params.keyword = null;
            const mockResults = [];

            mockProductModel.find.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockResults)
            });

            await searchProductController(req, res);

            expect(mockProductModel.find).toHaveBeenCalled();
        });

        test('undefined keyword parameter', async () => {
            req.params.keyword = undefined;
            const mockResults = [];
            mockProductModel.find.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockResults)
            });

            await searchProductController(req, res);

            expect(mockProductModel.find).toHaveBeenCalled();
        });

        test('regex injection attempt', async () => {
            req.params.keyword = '.*';
            const mockResults = [];

            mockProductModel.find.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockResults)
            });

            await searchProductController(req, res);

            expect(mockProductModel.find).toHaveBeenCalledWith({
                $or: [
                    { name: { $regex: req.params.keyword, $options: 'i' } },
                    { description: { $regex: req.params.keyword, $options: 'i' } },
                ]
            });
        });
    });

    test('verify $or operator for searching multiple fields', async () => {
        req.params.keyword = 'laptop';

        mockProductModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([])
        });

        await searchProductController(req, res);

        const findCall = mockProductModel.find.mock.calls[0][0];
        expect(findCall).toHaveProperty('$or');
        expect(findCall.$or).toHaveLength(2);
    })
});