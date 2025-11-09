import React from "react";
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from './Login';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

const mockSetAuth = jest.fn();
const mockNavigate = jest.fn();
let mockLocationState = null;

jest.mock('../../context/auth', () => ({
  // useAuth: jest.fn(() => [null, jest.fn(null, mockSetAuth)]) // Mock useAuth hook to return null state and a mock function for setAuth
  useAuth: jest.fn(() => [null, mockSetAuth])
  // useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));

jest.mock('../../components/Header', () => () => <div>Mocked Header</div>);

axios.get = jest.fn().mockResolvedValue({ data: { category: [] } });

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState })
}));

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

const renderLogin = () => {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>
  );
}

const fillForm = ({ email, password }) => {
  if (email !== undefined) {
    fireEvent.change(
      screen.getByPlaceholderText('Enter Your Email'), 
      { target: { value: email } }
    );
  }

  if (password !== undefined) {
    fireEvent.change(
      screen.getByPlaceholderText('Enter Your Password'), 
      { target: { value: password } }
    );
  }
};


describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = null;
  });

  it('should render all form elements correctly', () => {
    renderLogin();

    expect(screen.getByText('LOGIN FORM')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Password')).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();

  });

  it('inputs should be initially empty', () => {
    renderLogin();

    expect(screen.getByText('LOGIN FORM')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('');
    expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('');
  });

  it('inputs should be of correct types', () => {
    renderLogin();

    expect(screen.getByPlaceholderText('Enter Your Email').type).toBe('email');
    expect(screen.getByPlaceholderText('Enter Your Password').type).toBe('password');
    
    // expect(screen.getByPlaceholderText('Enter Your Email')).toHaveAttribute('type', 'email');
    // expect(screen.getByPlaceholderText('Enter Your Password')).toHaveAttribute('type', 'password');
  });

  it('should allow typing email and password', () => {
    renderLogin();

    fillForm({ email: 'test@example.com', password: 'password123' });

    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('test@example.com');
    expect(screen.getByPlaceholderText('Enter Your Password').value).toBe('password123');
  });
  
  it('should login the user successfully', async () => {
    
    const mockResponse = {
      data: {
        success: true,
        // message: 'Login successful',
        user: { id: 1, name: 'John Doe', email: 'test@example.com' },
        token: 'mockToken'
      }
    }

    axios.post.mockResolvedValueOnce(mockResponse);

    renderLogin();

    fillForm({ email: mockResponse.data.user.email, password: 'password123' });
    
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: mockResponse.data.user.email,
      password: 'password123'
    }));

    expect(toast.success).toHaveBeenCalledWith(undefined, {
      duration: 5000,
      icon: '🙏',
      style: {
        background: 'green',
        color: 'white'
      }
    });

    expect(mockSetAuth).toHaveBeenCalledWith({
      user: mockResponse.data.user,
      token: mockResponse.data.token
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'auth', 
      JSON.stringify(mockResponse.data)
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('login successfully with minimal fields', async () => {
    const mockResponse = {
      success: true,
      user: { id: 5 },
      token: 'mockToken'
    };

    axios.post.mockResolvedValueOnce({ data: mockResponse });

    renderLogin();

    fillForm({ email: 'minimal@test.com', password: 'pass' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 5 },
          token: 'mockToken'
        })
      );
    });
  });

  // doesn't work
  /*
  it('EP1: should accept valid email formats (valid partition)', async () => {
    const validEmails = [
      'user@example.com',
      'test.user@nus.edu.sg',
      'user+tag@example.com',
      'user123@test-domain.com'
    ];

    for (const email of validEmails) {
      jest.clearAllMocks();

      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Login successful',
          user: { id: 1, name: 'Test' },
          token: 'token123'
        }
      });

      // render new instance
      const { unmount } = renderLogin();

      // interact with this instance only
      const emailInput = screen.getByPlaceholderText('Enter Your Email');
      const passwordInput = screen.getByPlaceholderText('Enter Your Password');
      const loginButton = screen.getByText('LOGIN');

      fireEvent.change(emailInput, { target: { value: email } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
          email,
          password: 'password123'
        });
      });
      
      unmount();
    }
  });
  */

  it('valid password: simple alphanumeric password', async () => {
    axios.post.mockResolvedValueOnce({
      data: { 
        success: true, 
        user: { id: 1 }, 
        token: 'mockToken' 
      }
    });

    renderLogin();

    fillForm({ email: 'test@test.com', password: 'password123' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com',
        password: 'password123'
      });
    });
  });

  it('valid password: complex password with special characters', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'P@ssw0rd!@#$%'});
    fireEvent.click(screen.getByText('LOGIN'));

  });

  it('valid password: spaces in password', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();

    fillForm({ email: 'test@test.com', password: 'my secure password' });

    fireEvent.click(screen.getByText('LOGIN'));
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com',
        password: 'my secure password'
      });
    });
  })

  it('should display error message on failed login', async () => {
    axios.post.mockRejectedValueOnce({ 
      data: {
        success: false,
        message: 'Invalid credentials' 
      }}
    );
    // axios.post.mockResolvedValueOnce({ data: { success: false, message: 'Invalid email or password' } });

    renderLogin();

    fillForm({ email: 'test@example.com', password: 'password123' });
    // fillForm({ email: 'wrong@example.com', password: 'wrongpassword' });
    
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    }));

    // await waitFor(() => expect(axios.post).toHaveBeenCalledWith('Invalid credentials'));
    // await waitFor(() => expect(axios.post).toHaveBeenCalledWith('Invalid email or password'));
    // await waitFor(() => expect(axios.post).toHaveBeenCalled());
    
    // expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');

    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle single character email input', () => {
    renderLogin();
    
    fillForm({ email: 'a', password: 'password123' });
    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('a');

    // const emailInput = screen.getByPlaceholderText('Enter Your Email');
    // fireEvent.change(emailInput, { target: { value: 'a' } });
    // expect(emailInput.value).toBe('a');
  });

  it('should handle very long email input (boundary test)', () => {
    renderLogin();
    
    const emailInput = 'a'.repeat(1000) + '@example.com';
    fillForm({ email: emailInput, password: 'password123' });
    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe(emailInput);

    // const longEmail = 'a'.repeat(1000) + '@example.com';
    // const emailInput = screen.getByPlaceholderText('Enter Your Email');
    // fireEvent.change(emailInput, { target: { value: longEmail } });
    // expect(emailInput.value).toBe(longEmail);
  });

  it('should handle special characters in email', () => {
    renderLogin();
    
    const specialEmail = 'test+special@sub-domain.example.com';

    const emailInput = screen.getByPlaceholderText('Enter Your Email');
    fireEvent.change(emailInput, { target: { value: specialEmail } });
    
    expect(emailInput.value).toBe(specialEmail);
  
  });

  it('should handle single character password input (boundary test)', () => {
    renderLogin();
    
    const password = 'p';
    const passwordInput = screen.getByPlaceholderText('Enter Your Password');
    fireEvent.change(passwordInput, { target: { value: password } });
    expect(passwordInput.value).toBe(password);
  
  });

  it('should handle very long password input (boundary test)', () => {
    renderLogin();
    
    const longPassword = 'P@ssw0rd!' + 'x'.repeat(1000);
    const passwordInput = screen.getByPlaceholderText('Enter Your Password');
    fireEvent.change(passwordInput, { target: { value: longPassword } });
    expect(passwordInput.value).toBe(longPassword);
  
  });

  it('should handle password with special characters and spaces', () => {
    renderLogin();
    const complexPassword = 'P@ss w0rd! #$%^&*()_';
    const passwordInput = screen.getByPlaceholderText('Enter Your Password');
    fireEvent.change(passwordInput, { target: { value: complexPassword } });
    expect(passwordInput.value).toBe(complexPassword);
  });

/*
  it('1 character password', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'p' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com', password: 'p'
      });
    });
  });

  it('2 characters password', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'pw' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com', password: 'pw'
      });
    });
  });

  it('8 characters password (nominal value - common requirement)', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com', password: 'password'
      });
    });
  });

  it('very long password', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@test.com', password: 'password'
      });
    });
  });

  it('very very long (1000 characters) password', async () => {
    const longPassword = 'P@ss' + 'x'.repeat(996);
    expect(longPassword.length).toBe(1000);

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: longPassword });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });
  */
  
  // /*
  it.each([
    { description: '7 characters password', password: 'Passwor' },
    { description: '8 characters password (nominal value - common requirement)', password: 'Password' },
    { description: '9 character password', password: 'Password12' },
    { description: 'very long password', password: 'P@ss' + 'x'.repeat(996) },
    { description: 'extremely long password', password: 'P@ss' + 'y'.repeat(4996) }
  ])('$description', async ({ description, password }) => {
    const email = 'test@test.com';

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: email, password: password });

    fireEvent.click(screen.getByText('LOGIN'));

    if (description === 'very long password') {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(password.length).toBe(1000);
    } else if (description === 'extremely long password') {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(password.length).toBe(5000);
    }

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: email, password: password
      });
    });
  });
  // */
  
  // not sure what the previous page navigation is supposed to be
  /*
  it('should navigate to previous location after successful login', async () => {
    const mockUseLocation = require('react-router-dom').useLocation;
    mockUseLocation.mockReturnValueOnce({ state: '/previous-page' });

    const mockResponse = {
      data: {
        success: true,
        user: { id: 2, name: 'Jane Doe', email: 'jane@example.com' },
        token: 'mockToken456'
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    renderLogin();

    fillForm({ email: 'jane@example.com', password: 'password456' });
    
    fireEvent.click(screen.getByText('LOGIN'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/previous-page'));
  })
  */

  it('should handle network error during login', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'));
    
    renderLogin();
    fillForm({ email: 'test@example.com', password: 'password123'});
    fireEvent.click(screen.getByText('LOGIN'));
    
    await waitFor(() => 
      expect(toast.error).toHaveBeenCalledWith('Something went wrong'),
      expect(mockSetAuth).not.toHaveBeenCalled(),
      expect(localStorage.setItem).not.toHaveBeenCalled()
    );
    // expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle 401 Unauthorized error', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Unauthorized' } }
    });

    renderLogin();

    fillForm( { email: 'test@example.com', password: 'wrongpassword' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });

  })

  it('should handle 500 Internal Server Error', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Server error' } }
    });

    renderLogin();

    fillForm( { email: 'test@example.com', password: 'password123' } );

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  
  });

  it('server unreachable error', async () => {
    axios.post.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
      message: 'connect ECONNREFUSED'
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  // it('minimum valid email length', async () => {
  //   axios.post.mockResolvedValueOnce({
  //     data: {
  //       success: true,
  //       user: { id: 1 },
  //       token: 'mockToken'
  //     }
  //   });

  //   renderLogin();
  //   fillForm({ email: 'a@b', password: 'password' });

  //   fireEvent.click(screen.getByText('LOGIN'));

  //   await waitFor(() => {
  //     expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
  //       email: 'a@b',
  //       password: 'password'
  //     });
  //   });
  // });

  // it('email min+1 boundary', async () => {
  //   axios.post.mockResolvedValueOnce({
  //     data: {
  //       success: true,
  //       user: { id: 1 },
  //       token: 'miniToken'
  //     }
  //   });

  //   renderLogin();
  //   fillForm({ email: 'ab@c.d', password: 'password' });

  //   fireEvent.click(screen.getByText('LOGIN'));

  //   await waitFor(() => {
  //     expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
  //       email: 'ab@c.d',
  //       password: 'password'
  //     });
  //   });
  // });


  // https://stackoverflow.com/questions/1423195/what-is-the-actual-minimum-length-of-an-email-address-as-defined-by-the-ietf
  it.each([
    { description: 'minimum valid email length', email: 'a@b' },
    { description: 'email min+1 boundary', email: 'ab@c.d' }
  ])('$description', async ({ email }) => {
    axios.post.mockResolvedValueOnce({
      data: { 
        success: true, 
        user: { id: 1 }, 
        token: 'mockToken' 
      }
    });

    renderLogin();
    fillForm({ email, password: 'password' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email, 
        password: 'password'
      });
    });
  });

  it.each([
    { description: 'below minimum valid email length', email: 'a@' },
    { description: 'missing "@" symbol', email: 'abc.com' },
  ])('$description', async ({ email }) => {
    renderLogin();
    fillForm({ email, password: 'password' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });

    // expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
  it('email maximum boundary (255+ characters)', async () =>  {
    // name (64 characters) + @ (1 character) + domain (190 characters)
    const longEmail = 'a'.repeat(64) + '@' + 'b'.repeat(190) + '.com';
    expect(longEmail.length).toBeGreaterThan(254);

    renderLogin();
    fillForm({ email: longEmail, password: 'password' });

    const emailInput = screen.getByPlaceholderText('Enter Your Email');
    emailInput.setCustomValidity(''); // clear any built-in validation
    emailInput.reportValidity(); // clear any built-in validation
    
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled()
    });
  });

  it('should navigate to forgot password page when button clicked', async () => {
    renderLogin();

    fireEvent.click(screen.getByText('Forgot Password'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('should not submit form when pressing Enter in email field if password is empty', () => {
    renderLogin();
    
    const emailInput = screen.getByPlaceholderText('Enter Your Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });
    
    // should not call axios.post since required field is empty
    expect(axios.post).not.toHaveBeenCalled();
    // fireEvent.click(screen.getByText('LOGIN'));
  });

  it('should handle empty email with valid password combination', async () => {
    renderLogin();

    // fill password. leave email empty
    fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('LOGIN'));

    // form should not submit due to HTML5 validation
    await waitFor(() => { expect(axios.post).not.toHaveBeenCalled(); });

  });

  it('should handle valid email with empty password combination', async () => {
    renderLogin();

    // fill email. leave password empty
    fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });

    fireEvent.click(screen.getByText('LOGIN'));
    
    // form should not submit due to HTML5 validation
    await waitFor(() => { expect(axios.post).not.toHaveBeenCalled() });

  });
  

  /*
  it('should handle response with missing user data', async () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'Login successful',
        token: 'mockToken'
        // missing user object
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    renderLogin();

    fillForm({ email: 'test@example.com', password: 'password123' });
    
    fireEvent.click(screen.getByText('LOGIN'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      user: undefined,
      token: 'mockToken'
    }));

  });
  */

  /*
  it('should handle response with missing token', async () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'Login successful',
        user: { id: 1, name: 'John Doe', email: 'test@example.com' }
        // missing token
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    renderLogin();

    fillForm({ email: 'test@example.com', password: 'password123' });
    
    fireEvent.click(screen.getByText('LOGIN'));
    
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      user: mockResponse.data.user,
      token: undefined
    }));
    
  });
  */

  /*
  it('should trim whitespace from email before submission', async () => {
    const mockResponse = {
      data: {
        success: true,
        user: { id: 1, name: 'John Doe', email: 'test@example.com' },
        token: 'mockToken'
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    renderLogin();

    // current implementation doesn't trim, so this tests actual behaviour
    fillForm({ email: '  test@example.com  ', password: 'password123' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: '  test@example.com  ',
      password: 'password123'
    }));
  });
  */

  // it('should not expose password in error logs', async () => {
  //   const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
  //   axios.post.mockRejectedValueOnce(new Error('Network Error'));

  //   renderLogin();

  //   const password = 'secretPassword123!';
  //   fillForm({ email: 'test@example.com', password: password });
  //   fireEvent.click(screen.getByText('LOGIN'));

  //   await waitFor(() => 
  //     expect(toast.error).toHaveBeenCalledWith('Something went wrong')
  //   // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Network Error'))
  //   );

  //   // ensure password is not logged
  //   expect(consoleSpy).toHaveBeenCalled();
  //   const loggedContent = consoleSpy.mock.calls.map(call => JSON.stringify(call)).join(' ');
  //   expect(loggedContent).not.toContain(password);
  //   // expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(password));

  //   consoleSpy.mockRestore();
    
  // });
  

  /*
  ============================================================
  TECHNIQUE 3: DECISION TABLE TESTING
  
  PRINCIPLE: Systematically test all combinations of conditions.
  Create a table mapping condition combinations to expected actions.
  
  CONDITIONS:
  C1: Response received? (Y/N)
  C2: success field? (True/False/Missing)
  C3: user field? (Present/Null/Missing)
  C4: token field? (Present/Null/Missing)
  
  ACTIONS:
  A1: Show success toast
  A2: Show error toast
  A3: Update auth context
  A4: Store in localStorage
  A5: Navigate
  
  Decision Table (10 key combinations):
  Rule | C1 | C2    | C3      | C4      | A1 | A2 | A3 | A4 | A5
  -----|----|----- -|---------|---------|----|----|----|----|----
  DT1  | Y  | True  | Present | Present | ✓  |    | ✓  | ✓  | ✓
  DT2  | Y  | True  | Null    | Present |    |    | ✓  | ✓  | ✓
  DT3  | Y  | True  | Present | Null    |    |    | ✓  | ✓  | ✓
  DT4  | Y  | True  | Missing | Missing |    |    | ✓  | ✓  | ✓
  DT5  | Y  | False | -       | -       |    | ✓  |    |    |
  DT6  | Y  | Null  | -       | -       |    |    |    |    |
  DT7  | N  | -     | -       | -       |    | ✓  |    |    |
  ============================================================
  */
  
  it('response=Y, success=True, user=Exists, token=Exists', async () => {
    const mockResponse = {
      success: true,
      message: 'Welcome',
      user: { id: 1, name: 'John', email: 'john@doe.com' },
      token: 'mockToken'
    };

    axios.post.mockResolvedValueOnce({ data: mockResponse });

    renderLogin();
    fillForm({ email: 'john@doe.com', password: 'password' })
    fireEvent.click(screen.getByText('LOGIN'));

    // await waitFor(() => 
    //  expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register',
    //  expect.objectContaining({ DOB: today })
    //     ));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome', expect.any(Object));
    });

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({
        user: mockResponse.user,
        token: mockResponse.token
      }));
    });

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('auth', JSON.stringify(mockResponse));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

  });

  it('auth with null user: response=Y, success=T, user=Null, token=Exists', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Partial auth',
        user: null,
        token: 'mockToken'
      }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({
        user: null,
        token: 'mockToken'
      }));
    });

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('auth with null token: response=Y, success=T, user=Exists, token=Null', async () => {
    const user = { id: 2, name: 'Jane' };
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'User only',
        user: user,
        token: null
      }
    });

    renderLogin();
    fillForm({ email: 'jane@doe.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({
        user: user,
        token: null
      }));
    });
  });

  it('auth with undefined values: response=Y, success=T, user=Missing, token=Missing', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Minimal response'
        // user and token missing in data
      }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));
    
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({
        user: undefined,
        token: undefined
      }));
    });
  });

  it('error toast: response=Y, success=False', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: 'Authentication failed'
      }
    });

    renderLogin();
    fillForm({ email: 'fail@test.com', password: 'wrong' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Authentication failed');
    });
    
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  /*
  it('no actions taken: response=Y, success=Null', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        message: 'No success field'
        // success field missing
      }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    // Do nothing
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
  */

  // no action taken: response=Y, data=null
  it('should handle malformed JSON response', async () => {
    axios.post.mockResolvedValueOnce({ data: null });

    renderLogin();
    fillForm({ email: 'test@example.com', password: 'password123'});
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => 
      expect(axios.post).toHaveBeenCalled(), 
      expect(mockSetAuth).not.toHaveBeenCalled() 
    );
  });

  it('error with undefined message: response=Y, success=False, message=undefined', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false
        // missing message
      }
    });

    renderLogin();
    fillForm({ email: 'test@test.com', password: 'password' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(undefined);
    });
  });


  /*
  ============================================================
  TECHNIQUE 4: PAIRWISE (ALL-PAIRS) COMBINATORIAL TESTING
  
  PRINCIPLE: Test all pairwise combinations of parameters.
  Instead of testing all combinations (2^N), test pairs (N^2).
  
  PARAMETERS (each with 2-3 levels):
  P1: Email complexity (Simple | Complex)
  P2: Password length (Short ≤8 | Long >8)
  P3: Network result (Success | Failure)
  P4: Redirect location (None | Present)
  
  Using pairwise algorithm, we need minimum 8 tests to cover
  all pairs. This reduces from 2*2*2*2=16 full combinations.
  
  Pairwise Matrix:
  Test | P1      | P2    | P3      | P4      
  -----|---------|-------|---------|----------
  P1   | Simple  | Short | Success | None     
  P2   | Simple  | Long  | Success | Present  
  P3   | Simple  | Short | Failure | Present  
  P4   | Simple  | Long  | Failure | None     
  P5   | Complex | Short | Success | Present  
  P6   | Complex | Long  | Success | None     
  P7   | Complex | Short | Failure | None     
  P8   | Complex | Long  | Failure | Present  
  ============================================================
  */

  it('simple email + short password + success + no redirect', async () => {
    // mockLocationState = null;
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'user@test.com', password: 'pass123' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'user@test.com',
        password: 'pass123'
      });
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/');

  });

  it('simple email + long password + success + redirect', async () => {
    mockLocationState = '/dashboard';

    const longPassword = 'ThisIsALongPassword123$%^';
    expect(longPassword.length).toBeGreaterThan(8);

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();
    fillForm({ email: 'user@test.com', password: longPassword });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('simple email + long password + failure + redirect', async () => {
    mockLocationState = '/products';
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'Login failed' }
    });
    renderLogin();

    fillForm({ email: 'test@example.com', password: 'pass' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Login failed');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('simple email + long password + failure + no redirect', async () => {
    // mockLocationState = null;
    const longPassword = 'VeryLongIncorrectPassword456!@#$%';
    axios.post.mockRejectedValueOnce(new Error('Network error'));
    renderLogin();

    fillForm({ email: 'test@example.com', password: longPassword });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  it('complex email + short password + success + redirect', async () => {
    mockLocationState = '/cart';
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });

    renderLogin();

    fillForm({ email: 'first.last+tag@sub.domain.nus.edu.sg', password: 'password213' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cart');
    });
  });

  it('complex email + long password + success + no redirect', async () => {
    const longPassword = 'ComplexLongPassword123!@#$%^&*()';
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { id: 1 }, token: 'mockToken' }
    });
    renderLogin();

    fillForm({ email: 'user+work@company.example.org', password: longPassword });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    })
  });

  it('complex email + short password + failure + no redirect', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'Invalid' }
    });
    renderLogin();

    fillForm({ email: 'test.user+label@mail.test.com', password: 'abc123' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('complex email + long password + failure + redirect', async () => {
    mockLocationState = '/checkout';
    const longPassword = 'WrongButLongPassword789!@#$%^';
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'Auth failed' }
    });
    renderLogin();

    fillForm({ email: 'complex.user+tag@subdomain.example.com', password: longPassword });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Auth failed');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });


  /*
  ============================================================
  TECHNIQUE 5: FINITE STATE MACHINE (FSM) TESTING
  
  PRINCIPLE: Model system as states and transitions.
  Test state transitions and verify state invariants.
  
  STATES:
  S1: INITIAL (empty form, no submission)
  S2: INPUT_FILLED (credentials entered)
  S3: SUBMITTING (waiting for API response)
  S4: SUCCESS (login successful, auth updated)
  S5: ERROR (login failed, error shown)
  
  TRANSITIONS:
  T1: INITIAL → INPUT_FILLED (user types credentials)
  T2: INPUT_FILLED → SUBMITTING (user clicks LOGIN)
  T3: SUBMITTING → SUCCESS (API returns success=true)
  T4: SUBMITTING → ERROR (API returns success=false or throws)
  T5: ERROR → INPUT_FILLED (user corrects input)
  T6: INPUT_FILLED → SUCCESS (retry succeeds)
  
  STATE INVARIANTS:
  I1: INITIAL - inputs empty, no API calls
  I2: INPUT_FILLED - inputs have values, no API calls yet
  I3: SUCCESS - auth updated, navigation occurred
  I4: ERROR - error toast shown, form still visible for retry
  ============================================================
  */

  it('complete success path: initial -> input filled -> submitting -> success', async () => {
    // must render login before we can get the emailInput field
    renderLogin();
    
    const emailInput = screen.getByPlaceholderText('Enter Your Email');
    const passwordInput = screen.getByPlaceholderText('Enter Your Password');
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Success',
        user: { id: 1, name: 'John' }, 
        token: 'mockToken'
      }
    });
    
    expect(emailInput.value).toBe('');
    expect(passwordInput.value).toBe('');
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
    
    fillForm({ email: 'user@test.com', password: 'password123' });
    
    expect(emailInput.value).toBe('user@test.com');
    expect(passwordInput.value).toBe('password123');
    expect(axios.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Success', {"duration": 5000, "icon": "🙏", "style": {"background": "green", "color": "white"}});
    })

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled();
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
  
  it('error path: initial -> input filled -> submitting -> error', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: 'Invalid credentials'
      }
    });
    renderLogin();

    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('');

    fillForm({ email: 'wrong@test.com', password: 'wrongpass' });

    expect(screen.getByPlaceholderText('Enter Your Email').value).toBe('wrong@test.com');

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    });

    await waitFor(() => {
      expect(mockSetAuth).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();

  });
  
  it('retry after error: error -> input filled -> success', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'First attempt failed' }
    });
    renderLogin();

    fillForm({ email: 'user@test.com', password: 'wrongpass' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('First attempt failed');
    });

    jest.clearAllMocks();

    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Second attempt success',
        user: { id: 1 },
        token: 'mockToken'
      }
    });

    fillForm({ password: 'correctpass' });

    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Second attempt success', expect.any(Object));
    });
    expect(mockNavigate).toHaveBeenCalled();
  });
  
  it('multiple retries: error -> error -> success', async () => {
    renderLogin();

    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'ERROR' }
    });

    fillForm({ email: 'user@test.com', password: 'attempt1' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ERROR');
    });

    jest.clearAllMocks();

    axios.post.mockResolvedValueOnce({
      data: { success: false, message: 'ERROR_AGAIN'}
    });

    fillForm({ password: 'attempt2' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('ERROR_AGAIN');
    });

    jest.clearAllMocks();

    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: { id: 1 },
        token: 'mockToken'
      }
    });

    fillForm({ password: 'correctpassword' });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
  
  it('invalid transition, partial input: initial -> partial input', () => {
    renderLogin();

    const emailInput = screen.getByPlaceholderText('Enter Your Email');
    const passwordInput = screen.getByPlaceholderText('Enter Your Password');

    expect(emailInput.value).toBe('');
    expect(passwordInput.value).toBe('');

    fillForm({ email: 'partial@test.com' });

    expect(emailInput.value).toBe('partial@test.com');
    expect(passwordInput.value).toBe('');

    fireEvent.click(screen.getByText('LOGIN'));

    expect(axios.post).not.toHaveBeenCalled();
  });

});
