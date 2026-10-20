import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/common/Input';
import PasswordInput from '../components/common/PasswordInput';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full Name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
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
      const res = await register(formData);
      if (res.success) {
        success('Account created successfully! Welcome to PrepAgent AI.');
        // First-time registered user ALWAYS starts at Preparation Setup
        navigate('/preparation/setup');
      } else {
        toastError(res.message || 'Failed to create account.');
      }
    } catch (err) {
      let msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]);

      // No HTTP response => network/CORS/timeout. Surface a useful, safe hint
      // instead of a generic failure, without leaking internal details.
      if (!msg && !err.response) {
        msg =
          'Could not reach the server. Please check your connection and try again.';
      }

      toastError(msg || 'An error occurred during registration.');
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
          Create Your Account
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Start your interview preparation journey.
        </p>
      </div>

      {/* Form Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card padding="p-6 sm:p-8" className="shadow-xl shadow-royal-900/5 border-slate-200/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              placeholder="e.g. Vidya Hatture"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              icon={User}
              required
            />

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
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <PasswordInput
              label="Confirm Password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
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
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-royal-600 hover:text-royal-700 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
