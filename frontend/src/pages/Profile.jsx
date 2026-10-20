import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.profile?.phone || '',
    bio: user?.profile?.bio || '',
    education: user?.profile?.education || '',
    experienceLevel: user?.profile?.experienceLevel || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.profile?.phone || '',
        bio: user.profile?.bio || '',
        education: user.profile?.education || '',
        experienceLevel: user.profile?.experienceLevel || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateProfile(formData);
      if (res.success) {
        toastSuccess('Profile updated successfully.');
      } else {
        toastError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Error updating profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-4">
      {/* Profile Overview Card */}
      <Card padding="p-6 sm:p-8" className="border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-royal-600 to-brand-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-royal-600/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="success" size="sm">
                  Active Member
                </Badge>
                <span className="text-xs text-slate-400">
                  Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Profile Form */}
      <Card padding="p-6 sm:p-8" className="border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Edit Profile Information</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={User}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full text-sm rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 px-3.5 py-2.5 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Account email cannot be modified.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Phone Number"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
            />

            <Select
              label="Experience Level"
              name="experienceLevel"
              value={formData.experienceLevel}
              onChange={handleChange}
              options={['Fresher', 'Entry Level', 'Intermediate', 'Experienced']}
              placeholder="Select Experience Level"
            />
          </div>

          <Input
            label="Education"
            name="education"
            placeholder="e.g. B.Tech Computer Science, Stanford University"
            value={formData.education}
            onChange={handleChange}
          />

          <Textarea
            label="Professional Bio"
            name="bio"
            rows={4}
            placeholder="Tell us about your background, strengths, and career aspirations..."
            value={formData.bio}
            onChange={handleChange}
          />

          <div className="pt-2 flex flex-col sm:flex-row justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={Save}
              className="w-full sm:w-auto shadow-md shadow-royal-600/20"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
