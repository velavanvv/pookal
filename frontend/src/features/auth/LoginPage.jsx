import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import DemoRequestModal from './DemoRequestModal';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useI18n();
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
        title={t('loginTitle')}
        subtitle={t('loginSubtitle')}
        submitLabel={t('signIn')}
        values={values}
        errors={errors}
        onChange={onChange}
        onSubmit={onSubmit}
        fields={[
          { name: 'email',    label: t('email'),    type: 'email',    placeholder: 'owner@shop.com' },
          { name: 'password', label: t('password'), type: 'password', placeholder: '••••••••' },
        ]}
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <span>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => setShowDemo(true)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--pookal-rose)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
              >
                Request a demo
              </button>
              {' '}— a platform admin will create your shop and plan.
            </span>
            <LanguageSwitcher variant="inline" />
          </div>
        }
      />
      {showDemo && <DemoRequestModal onClose={() => setShowDemo(false)} />}
    </>
  );
}

