import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AuthForm from './AuthForm';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [values, setValues] = useState({
    email: 'owner@pookal.test',
    password: 'password123'
  });
  const [errors, setErrors] = useState({});

  const onChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setErrors({
        email: error.response?.data?.errors?.email?.[0] || 'Login failed. Please verify your credentials.'
      });
    }
  };

  return (
    <AuthForm
      title="Sign in to Pookal"
      subtitle="Access POS, inventory, delivery, and CRM from one florist control room."
      submitLabel="Sign in"
      values={values}
      errors={errors}
      onChange={onChange}
      onSubmit={onSubmit}
      fields={[
        { name: 'email', label: 'Email address', type: 'email', placeholder: 'owner@shop.com' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password' }
      ]}
      footer={
        <>
          New to Pookal? <Link to="/register">Create an account</Link>
        </>
      }
    />
  );
}
