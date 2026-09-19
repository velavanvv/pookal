import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthForm from './AuthForm';
import { useAuth } from './AuthContext';
import api from '../../services/api';

const FALLBACK_SHOP_TYPES = [
  { key: 'retail', label: 'Retail / Supermarket', description: 'General store, supermarket, stationery, gifts', icon: 'bi-cart3' },
  { key: 'fresh_perishable', label: 'Fresh / Perishable', description: 'Flower shop, fish market, chicken shop, fruits & vegetables', icon: 'bi-droplet-half' },
  { key: 'restaurant', label: 'Restaurant / Café', description: 'Dine-in, takeaway, cloud kitchen', icon: 'bi-cup-hot' },
  { key: 'service', label: 'Service Business', description: 'Salon, repair shop, clinic, laundry', icon: 'bi-scissors' },
  { key: 'hybrid', label: 'Hybrid / Multi-category', description: 'Retail + delivery + multiple product types', icon: 'bi-shop' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [shopTypes, setShopTypes] = useState(FALLBACK_SHOP_TYPES);
  const [values, setValues] = useState({
    name: '',
    shop_name: '',
    business_type: 'retail',
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/shop-types').then(({ data }) => {
      if (data.types?.length) setShopTypes(data.types);
    }).catch(() => {});
  }, []);

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
        shop_name: apiErrors.shop_name?.[0],
        business_type: apiErrors.business_type?.[0],
        email: apiErrors.email?.[0],
        password: apiErrors.password?.[0]
      });
    }
  };

  return (
    <AuthForm
      title="Create your shop workspace"
      subtitle="One billing platform for supermarkets, restaurants, fresh markets, and more."
      submitLabel="Create account"
      values={values}
      errors={errors}
      onChange={onChange}
      onSubmit={onSubmit}
      fields={[
        { name: 'name', label: 'Your name', type: 'text', placeholder: 'Shop owner name' },
        { name: 'shop_name', label: 'Shop name', type: 'text', placeholder: 'My Store' },
        { name: 'email', label: 'Email address', type: 'email', placeholder: 'owner@shop.com' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Minimum 8 characters' },
        {
          name: 'password_confirmation',
          label: 'Confirm password',
          type: 'password',
          placeholder: 'Repeat your password'
        }
      ]}
      extra={
        <div className="pk-field" style={{ marginBottom: '1rem' }}>
          <label>Business type</label>
          <div className="shop-type-grid">
            {shopTypes.map((type) => (
              <label
                key={type.key}
                className={`shop-type-card ${values.business_type === type.key ? 'shop-type-card--active' : ''}`}
              >
                <input
                  type="radio"
                  name="business_type"
                  value={type.key}
                  checked={values.business_type === type.key}
                  onChange={onChange}
                  style={{ display: 'none' }}
                />
                <i className={`bi ${type.icon}`} />
                <span className="shop-type-card__label">{type.label}</span>
                <span className="shop-type-card__desc">{type.description}</span>
              </label>
            ))}
          </div>
          {errors.business_type && <div className="pk-error">{errors.business_type}</div>}
        </div>
      }
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    />
  );
}
