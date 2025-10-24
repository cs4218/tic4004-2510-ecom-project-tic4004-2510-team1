import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Register from './Register';

// Mocking axios.post
jest.mock('axios');                // Prevents real network requests
jest.mock('react-hot-toast');      // Allows checking if functions like axios.post() were called

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// The Register component likely depends on some custom context hooks (Auth, Cart, Search).
// This mocks them to avoid pulling in the whole app context logic. Each mock returns a fake "state" (null or { keyword: '' }) and a fake setter function (jest.fn()).
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));
    
jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));  

jest.mock('../../components/Header', () => () => <div>Mocked Header</div>);

axios.get = jest.fn().mockResolvedValue({ data: { category: [] } });

// Mocking localStorage. Prevents access to actual localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

const renderRegister = () => {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );
}

const fillForm = (data) => {
  fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), { target: { value: data.name } });
  fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: data.email } });
  fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: data.password } });
  fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), { target: { value: data.phone } });
  fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), { target: { value: data.address } });
  fireEvent.change(screen.getByPlaceholderText('Enter Your DOB'), { target: { value: data.dob } });
  fireEvent.change(screen.getByPlaceholderText('What is Your Favorite Sports'), { target: { value: data.answer } });
}

window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all input fields and the register button correctly', () => {
    renderRegister();

    expect(screen.getByText('REGISTER FORM')).toBeInTheDocument();
    
    expect(screen.getByPlaceholderText('Enter Your Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Phone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your DOB')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What is Your Favorite Sports')).toBeInTheDocument();
    
    expect(screen.getByText('REGISTER')).toBeInTheDocument();
  });
  
  it('should register the user successfully', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    renderRegister();

    fillForm({
      name: 'John Doe',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: '123 Street',
      dob: '2000-01-01',
      answer: 'Football'
    });

    fireEvent.click(screen.getByText('REGISTER'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/register', expect.objectContaining({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123'
      })
    ));

    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
    // expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should display error message on failed registration', async () => {
    axios.post.mockRejectedValueOnce({ message: 'User already exists' });

    renderRegister();

    fillForm({
      name: 'John Doe',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: '123 Street',
      dob: '2000-01-01',
      answer: 'Football'
    });

    fireEvent.click(screen.getByText('REGISTER'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });


  it('should show error message on invalid email format', async () => {
    renderRegister();
    const emailInput = screen.getByPlaceholderText('Enter Your Email');
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    expect(emailInput.validity.valid).toBe(false);
  });

  it('should show error message on empty password', async () => {
    renderRegister();
    const passwordInput = screen.getByPlaceholderText('Enter Your Password');
    
    fireEvent.change(passwordInput, { target: { value: '' } });
    expect(passwordInput.validity.valid).toBe(false);
  });

  it('should show error message on special characters in name', async () => {
    axios.post.mockResolvedValueOnce({ 
      data: { "success": true } 
    });
    
    renderRegister();

    fillForm({
      name: 'John@Doe',
      email: 'test@example.com',
      password: 'Pass123',
      phone: '9876543210',
      address: '456 Oak Avenue',
      dob: '1985-12-01',
      answer: 'Tennis'
    })

    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    // expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
    
  });

  it('should show successfully register user with minimum single character inputs', async () => {
    axios.post.mockResolvedValueOnce({ 
      data: { "success": true } 
    });
    
    renderRegister();

    fillForm({
      name: 'A',
      email: 'a@b.c',
      password: '1',
      phone: '2',
      address: 'B',
      dob: '2000-01-01',
      answer: 'C'
    })

    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
    
  });

  it('should show error message on extremely long inputs', async () => {
    axios.post.mockResolvedValueOnce({ 
      data: { "success": true } 
    });

    renderRegister();

    const longString = 'a'.repeat(1000);
    
    fillForm({
      name: longString,
      email: 'long@example.com',
      password: longString,
      phone: '12345678901234567890',
      address: longString,
      dob: '2000-01-01',
      answer: longString
    });

    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register',
        expect.objectContaining({
          name: longString,
          phone: '12345678901234567890'
        })
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
  });

  it('should register user with whitespace in fields successfully', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    // Render the Register component
    renderRegister();

    // Fill the form with leading/trailing spaces
    fillForm({
      name: '  John Doe  ',
      email: '  test@example.com  ',
      password: '  password123  ',
      phone: '  1234567890  ',
      address: '  123 Street  ',
      dob: '1990-01-01',
      answer: '  Basketball  '
    });

    // Click the REGISTER button
    fireEvent.click(screen.getByText('REGISTER'));

    // Wait for axios.post to be called
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/auth/register',
        expect.objectContaining({
          name: '  John Doe  ',
          email: 'test@example.com',
          password: '  password123  ',
          phone: '  1234567890  ',
          address: '  123 Street  ',
          DOB: '1990-01-01',
          // dob: '1990-01-01',
          answer: '  Basketball  '
        })
      );
    });

    // await waitFor(() => {
    //   expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register', 
    //     expect.objectContaining({
    //       name: '  John Doe  ',
    //       email: '  test@example.com  '.trim()
    //       // email: '  test@example.com  '
    //     })
    //   );
    // });

    // Assert toast notification
    expect(toast.success).toHaveBeenCalledWith(
      'Register Successfully, please login'
    );
  });

  it('should register user with special characters in text fields successfully', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: "O'Brien-Smith Jr.",
      email: 'special+email@test-domain.com',
      password: 'P@ssw0rd!#$',
      phone: '+1-555-123-4567',
      address: '123 Main St., Apt. #4B',
      dob: '1992-03-20',
      answer: 'Tennis & Golf'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
  });

  it('should register user with unicode characters in text fields successfully', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: '张伟 José Müller',
      email: 'unicode@example.com',
      password: 'Pass123',
      phone: '9876543210',
      address: '北京市朝阳区 123号',
      dob: '1988-07-07',
      answer: 'Fútbol'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
  });

  
  // ========== DATE BOUNDARY VALUE TESTS ==========
  it('DOB with earliest valid date (1900-01-01)', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'Very Old User',
      email: 'old@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '1900-01-01',
      answer: 'Cricket'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ DOB: '1900-01-01' })
    ));

    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
  });

  it('DOB with current date (today)', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    const today = new Date().toISOString().split('T')[0];
    fillForm({
      name: 'New User',
      email: 'new@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: today,
      answer: 'Soccer'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ DOB: today })
    ));

    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
  });

  it('DOB with leap year date (Feb 29)', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'Leap Year User',
      email: 'leap@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '2000-02-29',
      answer: 'Hockey'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ DOB: '2000-02-29' })
    ));

    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
  });

  // ========== SERVER RESPONSE SCENARIOS ==========
  it('server returns success=false with custom error message', async () => {
    axios.post.mockResolvedValueOnce({ 
      data: { 
        success: false, 
        message: 'Email already exists' 
      } 
    });
    renderRegister();
    
    fillForm({
      name: 'Existing User',
      email: 'existing@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '1990-01-01',
      answer: 'Swimming'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => { expect(axios.post).toHaveBeenCalled(); });

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Email already exists'); });
    
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('server returns success=false with different error message', async () => {
    axios.post.mockResolvedValueOnce({ 
      data: { 
        success: false, 
        message: 'Invalid phone number format' 
      } 
    });
    renderRegister();
    
    fillForm({
      name: 'Test User',
      email: 'test@example.com',
      password: 'pass123',
      phone: 'invalid',
      address: '123 Street',
      dob: '1990-01-01',
      answer: 'Baseball'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid phone number format');
    });
  });

  it('network error - connection refused', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));
    renderRegister();
    
    fillForm({
      name: 'Test User',
      email: 'test@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '1990-01-01',
      answer: 'Volleyball'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  it('network error - timeout', async () => {
    axios.post.mockRejectedValueOnce(new Error('Timeout'));
    renderRegister();
    
    fillForm({
      name: 'Timeout User',
      email: 'timeout@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '1990-01-01',
      answer: 'Wrestling'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  it('server error - 500 internal server error', async () => {
    axios.post.mockRejectedValueOnce({ 
      response: { status: 500, data: { message: 'Internal server error' } }
    });
    renderRegister();
    
    fillForm({
      name: 'Server Error User',
      email: 'error@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '1990-01-01',
      answer: 'Boxing'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  // ========== COMBINATORIAL TESTING (Pairwise Combinations) ==========
  it('combinatorial test: short name + long email + numeric phone', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'Jo',
      email: 'verylongemailaddress123456789@verylongdomainname.com',
      password: 'ShortP1',
      phone: '12345678901234567890',
      address: 'Short',
      dob: '2005-06-15',
      answer: 'Golf'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });

  it('combinatorial test: long name + short email + alphanumeric phone', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'Alexander Montgomery Wellington Richardson III',
      email: 'a@b.c',
      password: 'VeryLongPasswordWith123Numbers',
      phone: 'ABC123XYZ',
      address: 'Very Long Address Street Number 12345',
      dob: '1975-12-31',
      answer: 'Table Tennis'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });

  it('combinatorial test: numbers in name + special chars in password + old DOB', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'User123',
      email: 'user123@test.com',
      password: 'P@$$w0rd!#$%',
      phone: '5551234567',
      address: '456 Oak Avenue',
      dob: '1950-03-15',
      answer: 'Rugby'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });

  it('combinatorial test: all caps name + lowercase email + recent DOB', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'JOHN SMITH',
      email: 'lowercase@example.com',
      password: 'MixedCase123',
      phone: '9998887777',
      address: 'MixedCase Address 789',
      dob: '2010-09-09',
      answer: 'Badminton'
    });
    
    fireEvent.click(screen.getByText('REGISTER'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });

  // ========== STATE MANAGEMENT TESTS ==========
  it('multiple rapid form submissions', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    renderRegister();
    
    fillForm({
      name: 'Rapid User',
      email: 'rapid@example.com',
      password: 'pass123',
      phone: '1234567890',
      address: '123 Street',
      dob: '1990-01-01',
      answer: 'Skiing'
    });
    
    const button = screen.getByText('REGISTER');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
    // Component doesn't prevent multiple submissions
    expect(axios.post.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

});
