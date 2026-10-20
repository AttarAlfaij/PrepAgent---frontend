import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import PasswordInput from '../components/common/PasswordInput';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await login(formData);
      if (res.success) {
        success(`Welcome back, ${res.user.name}!`);

        // Mandatory Flow: Check if user has preparation sessions
        // If NO sessions -> /preparation/setup
        // If YES sessions -> /dashboard (or requested protected page)
        if (res.sessionCount === 0) {
          navigate('/preparation/setup');
        } else {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from);
        }
      } else {
        toastError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Unable to sign in. Please verify your credentials.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-50/50 via-slate-50 to-brand-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-royal-600 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-royal-600/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-royal-700 to-brand-700 bg-clip-text text-transparent">
            PrepAgent AI
          </span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Sign In to Your Account
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Resume your personalized interview preparation.
        </p>
      </div>

      {/* Form Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card padding="p-6 sm:p-8" className="shadow-xl shadow-royal-900/5 border-slate-200/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              required
            />

            <PasswordInput
              label="Password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full shadow-lg shadow-royal-600/25"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-royal-600 hover:text-royal-700 hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
