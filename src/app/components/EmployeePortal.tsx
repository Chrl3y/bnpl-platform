/**
 * Employee Portal
 * Onboarding, KYC verification, CRB verification, profile management
 * Where employees can self-serve and verify their identity
 */

import React, { useState } from 'react';
import {
  Users, FileCheck, CheckCircle2, AlertCircle, Upload,
  ArrowRight, Phone, Mail, Home, Calendar, Shield
} from 'lucide-react';

type OnboardingStep = 'WELCOME' | 'PERSONAL_INFO' | 'KYC' | 'CRB' | 'COMPLETE';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  address: string;
  city: string;
}

export default function EmployeePortal() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('WELCOME');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    dateOfBirth: '',
    address: '',
    city: '',
  });
  const [kycDocuments, setKycDocuments] = useState({
    nationalIdFront: null as File | null,
    nationalIdBack: null as File | null,
    profilePhoto: null as File | null,
  });
  const [crbSubmitted, setCrbSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (field: keyof typeof kycDocuments, file: File | null) => {
    setKycDocuments(prev => ({ ...prev, [field]: file }));
  };

  const progressSteps = ['Welcome', 'Personal Info', 'KYC', 'CRB', 'Complete'];
  const currentStepIndex = ['WELCOME', 'PERSONAL_INFO', 'KYC', 'CRB', 'COMPLETE'].indexOf(currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2">Employee Portal</h1>
          <p className="text-blue-100">Complete your onboarding and verification to unlock credit</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="flex items-center justify-between mb-8">
          {progressSteps.map((step, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                  idx <= currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {idx < currentStepIndex ? '✓' : idx + 1}
              </div>
              <div className={`h-1 flex-1 mx-2 ${idx < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-blue-600 text-white">
            ✓
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Welcome */}
          {currentStep === 'WELCOME' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-blue-100 rounded-full">
                  <Users size={48} className="text-blue-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to BNPL Platform</h2>
                <p className="text-gray-600">Complete a quick onboarding to start accessing instant credit with your employer</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle2 className="text-green-500 mb-3 mx-auto" size={28} />
                  <p className="font-semibold text-gray-900">Fast Approval</p>
                  <p className="text-sm text-gray-600">Get approved in minutes</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Shield className="text-green-500 mb-3 mx-auto" size={28} />
                  <p className="font-semibold text-gray-900">Secure</p>
                  <p className="text-sm text-gray-600">Your data is encrypted</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle2 className="text-green-500 mb-3 mx-auto" size={28} />
                  <p className="font-semibold text-gray-900">Easy Process</p>
                  <p className="text-sm text-gray-600">5 minutes to complete</p>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep('PERSONAL_INFO')}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 mx-auto"
              >
                Get Started <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 'PERSONAL_INFO' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
                <p className="text-gray-600">Tell us about yourself</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Grace"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Namusoke"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Mail size={16} /> Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="grace.namusoke@ura.go.ug"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Phone size={16} /> Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+256 701 234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">National ID *</label>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="CM123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar size={16} /> Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Home size={16} /> Residential Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="123 Main Street, Kampala"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Kampala"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setCurrentStep('WELCOME')}
                  className="px-6 py-2 border rounded-lg text-gray-900 hover:bg-gray-50 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('KYC')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 ml-auto"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: KYC Verification */}
          {currentStep === 'KYC' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">KYC Verification</h2>
                <p className="text-gray-600">Upload documents to verify your identity</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* National ID Front */}
                <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition">
                  <div className="text-center">
                    <Upload size={32} className="text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 mb-2">National ID (Front)</p>
                    <p className="text-sm text-gray-600 mb-4">PNG or JPEG, max 5MB</p>
                    <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 inline-block">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('nationalIdFront', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {kycDocuments.nationalIdFront && (
                      <p className="text-sm text-green-600 mt-2">✓ {kycDocuments.nationalIdFront.name}</p>
                    )}
                  </div>
                </div>

                {/* National ID Back */}
                <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition">
                  <div className="text-center">
                    <Upload size={32} className="text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 mb-2">National ID (Back)</p>
                    <p className="text-sm text-gray-600 mb-4">PNG or JPEG, max 5MB</p>
                    <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 inline-block">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('nationalIdBack', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {kycDocuments.nationalIdBack && (
                      <p className="text-sm text-green-600 mt-2">✓ {kycDocuments.nationalIdBack.name}</p>
                    )}
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition md:col-span-2">
                  <div className="text-center">
                    <Upload size={32} className="text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 mb-2">Profile Photo (Selfie)</p>
                    <p className="text-sm text-gray-600 mb-4">Clear face photo, PNG or JPEG, max 5MB</p>
                    <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 inline-block">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('profilePhoto', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {kycDocuments.profilePhoto && (
                      <p className="text-sm text-green-600 mt-2">✓ {kycDocuments.profilePhoto.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Tips for best results:</p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                    <li>• Ensure documents are clear and legible</li>
                    <li>• Good lighting, no shadows or glare</li>
                    <li>• Include all corners of the ID</li>
                    <li>• For selfie, face should be clearly visible</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setCurrentStep('PERSONAL_INFO')}
                  className="px-6 py-2 border rounded-lg text-gray-900 hover:bg-gray-50 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('CRB')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 ml-auto"
                  disabled={!kycDocuments.nationalIdFront || !kycDocuments.nationalIdBack || !kycDocuments.profilePhoto}
                >
                  Continue to CRB <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: CRB Verification */}
          {currentStep === 'CRB' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">CRB Verification</h2>
                <p className="text-gray-600">Check your credit history with the Central Reference Bureau</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-4 mb-4">
                  <FileCheck className="text-blue-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-gray-900">Why do we need CRB verification?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      CRB verification helps us assess your credit history, existing loans, and repayment behavior. This information is used to determine your credit limit and risk profile.
                    </p>
                  </div>
                </div>
              </div>

              {!crbSubmitted ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">We will check:</p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>✓ Your credit history</li>
                      <li>✓ Existing loans and liabilities</li>
                      <li>✓ Repayment performance</li>
                      <li>✓ CRB score assessment</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                    <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">This process is instant</p>
                      <p className="text-sm text-gray-600">Your CRB verification will be completed immediately. You'll see your results in seconds.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCrbSubmitted(true);
                      // Simulate CRB check
                      setTimeout(() => setCurrentStep('COMPLETE'), 2000);
                    }}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Authorize CRB Check
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4 py-8">
                  <div className="inline-flex p-4 bg-green-100 rounded-full">
                    <CheckCircle2 size={40} className="text-green-600" />
                  </div>
                  <p className="text-gray-600">Verifying your CRB profile...</p>
                </div>
              )}

              <div className="flex gap-4 mt-8">
                {!crbSubmitted && (
                  <button
                    onClick={() => setCurrentStep('KYC')}
                    className="px-6 py-2 border rounded-lg text-gray-900 hover:bg-gray-50 font-medium"
                  >
                    Back
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Onboarding Complete */}
          {currentStep === 'COMPLETE' && (
            <div className="text-center space-y-6 py-8">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 size={64} className="text-green-600" />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Grace! 🎉</h2>
                <p className="text-gray-600">Your onboarding is complete and you're all set!</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200 space-y-3">
                <div className="flex items-center gap-3 text-left">
                  <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-gray-900">KYC Verified</p>
                    <p className="text-sm text-gray-600">Your identity has been confirmed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-gray-900">CRB Checked</p>
                    <p className="text-sm text-gray-600">Score: 820/1000 (Excellent!)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <CheckCircle2 className="text-green-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-gray-900">Credit Ready</p>
                    <p className="text-sm text-gray-600">Your credit limit: UGX 1,000,000</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-8">
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                  Go to Dashboard
                </button>
                <button className="w-full px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold">
                  Apply for Your First Loan
                </button>
              </div>

              <p className="text-sm text-gray-600">
                Next step: Browse products and complete your first purchase! 🛍️
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
