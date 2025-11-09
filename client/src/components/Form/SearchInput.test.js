import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import SearchInput from './SearchInput';
import { SearchProvider } from '../../context/search';
import { act } from '@testing-library/react';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mocking axios.post
jest.mock('axios');

const renderSearchInput = () => {
    return render(
        <BrowserRouter>
            <SearchProvider>
                <SearchInput />
            </SearchProvider>
        </BrowserRouter>
    );
};

describe('SearchInput Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Empty string search', async () => {
        const mockData = { data: [] };
        axios.get.mockResolvedValue(mockData);

        renderSearchInput();

        const searchButton = screen.getByText('Search');

        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/')
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/search');
        });
    });

    test('Single character search', async () => {
        const mockData = { data: [{ _id: '1', name: 'Apple' }] };
        axios.get.mockResolvedValue(mockData);

        renderSearchInput();
        const input = screen.getByPlaceholderText('Search');

        const searchButton = screen.getByText('Search');
        // const searchButton = screen.getByRole('button', { name: /search/i });

        fireEvent.change(input, { target: { value: 'a' } });
        fireEvent.click(searchButton);

        // await act(async () => {
        //     fireEvent.click(searchButton);
        // });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/a')
        });
    });

    test('very long search string (upper boundary - 255 chars)', async () => {
        const longString = 'a'.repeat(255);
        const mockData = { data: [] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText('Search');

        fireEvent.change(input, { target: { value: longString } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/' + longString)
        });

    });

    test('search with minimal characters at boundaries', async () => {
        const specialString = '!@#$%';
        const mockData = { data: [] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText('Search');
        // const input = screen.getByText('search');

        fireEvent.change(input, { target: { value: specialString } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
    });



    test('EP-1: Valid alphanumeric input partition', async () => {
        // Arrange
        const mockData = { data: [{ _id: '1', name: 'Laptop123' }] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act
        fireEvent.change(input, { target: { value: 'Laptop123' } });
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/Laptop123');
        });
        expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    test('EP-2: Special characters only partition', async () => {
        // Arrange
        const mockData = { data: [] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act
        fireEvent.change(input, { target: { value: '@#$%&*' } });
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/@#$%&*');
        });
    });

    test('EP-3: Whitespace characters partition', async () => {
        // Arrange
        const mockData = { data: [] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/   ');
        });
    });

    test('EP-4: Mixed content partition (alphanumeric + spaces + special)', async () => {
        // Arrange
        const mockData = { data: [{ _id: '1', name: 'Product' }] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act
        fireEvent.change(input, { target: { value: 'iPhone 14 Pro!' } });
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/iPhone 14 Pro!');
        });
    });

    test('EP-5: Unicode characters partition', async () => {
        // Arrange
        const mockData = { data: [] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act
        fireEvent.change(input, { target: { value: '日本語テスト' } });
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
    });


    test('FSM-1: Initial state -> Input state -> Search state', async () => {
        // Arrange
        const mockData = { data: [{ _id: '1', name: 'Product' }] };
        axios.get.mockResolvedValue(mockData);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act - State 1: Initial (empty)
        expect(input.value).toBe('');

        // Act - State 2: Input entered
        fireEvent.change(input, { target: { value: 'test' } });
        expect(input.value).toBe('test');

        // Act - State 3: Search submitted
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    test('FSM-2: Multiple consecutive searches (state persistence)', async () => {
        // Arrange
        const mockData1 = { data: [{ _id: '1', name: 'First' }] };
        const mockData2 = { data: [{ _id: '2', name: 'Second' }] };
        axios.get.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act - First search
        fireEvent.change(input, { target: { value: 'first' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/first');
        });

        // Act - Second search
        fireEvent.change(input, { target: { value: 'second' } });
        fireEvent.click(screen.getByText('Search'));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/second');
        });
        expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    test('FSM-3: Input modification without submission', () => {
        // Arrange
        renderSearchInput();
        const input = screen.getByPlaceholderText(/search/i);

        // Act
        fireEvent.change(input, { target: { value: 'test1' } });
        expect(input.value).toBe('test1');

        fireEvent.change(input, { target: { value: 'test2' } });
        expect(input.value).toBe('test2');

        fireEvent.change(input, { target: { value: '' } });

        // Assert
        expect(input.value).toBe('');
        expect(axios.get).not.toHaveBeenCalled();
    });




});
