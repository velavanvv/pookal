import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthForm from './AuthForm';
import { useAuth } from './AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
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
      await register(values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {};
      setErrors({
        name: apiErrors.name?.[0],
        email: apiErrors.email?.[0],
        password: apiErrors.password?.[0]
      });
    }
  };

  return (
    <AuthForm
      title="Create your florist workspace"
      subtitle="Start with an owner account and expand to stores, staff, and delivery teams later."
      submitLabel="Create account"
      values={values}
      errors={errors}
      onChange={onChange}
      onSubmit={onSubmit}
      fields={[
        { name: 'name', label: 'Full name', type: 'text', placeholder: 'Pookal Admin' },
        { name: 'email', label: 'Email address', type: 'email', placeholder: 'owner@shop.com' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Minimum 8 characters' },
        {
          name: 'password_confirmation',
          label: 'Confirm password',
          type: 'password',
          placeholder: 'Repeat your password'
        }
      ]}
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    />
  );
}
