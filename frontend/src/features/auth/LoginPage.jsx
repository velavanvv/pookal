import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import DemoRequestModal from './DemoRequestModal';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showDemo, setShowDemo] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues(v => ({ ...v, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setErrors({
        email: error.response?.data?.errors?.email?.[0] || 'Incorrect email or password.',
      });
    }
  };

  return (
    <>
      <AuthForm
        title="Sign in to Pookal"
        subtitle="Access POS, inventory, delivery, and CRM from one florist control room."
        submitLabel="Sign in"
        values={values}
        errors={errors}
        onChange={onChange}
        onSubmit={onSubmit}
        fields={[
          { name: 'email',    label: 'Email address', type: 'email',    placeholder: 'owner@shop.com' },
          { name: 'password', label: 'Password',       type: 'password', placeholder: 'Enter your password' },
        ]}
        footer={
          <span>
            New to Pookal?{' '}
            <button
              type="button"
              onClick={() => setShowDemo(true)}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--pookal-rose)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
            >
              Request a demo
            </button>
            {' '}— our team will set you up.
          </span>
        }
      />
      {showDemo && <DemoRequestModal onClose={() => setShowDemo(false)} />}
    </>
  );
}
