'use client';

import { useMutation } from '@tanstack/react-query';
import GoogleButton from 'apps/user-ui/src/shared/components/google-button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios, { AxiosError } from 'axios';

type FormData = {
  name: string;
  email: string;
  password: string;
};

const SignUp = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(60);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [userData, setUserData] = useState<FormData | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const signUpMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/user-registration`,
        data
      );
      return response.data;
    },
    onSuccess: (_, formData) => {
      setUserData(formData);
      setShowOtp(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!userData) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-user`,
        {
          ...userData,
          otp: otp.join(''),
        }
      );
      return response.data();
    },
    onSuccess: () => {
      router.push('/login');
    },
  });

  const onSubmit = (data: FormData) => {
    signUpMutation.mutate(data);
  };

  const handleOtpChange = (i: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[i] = value;
    setOtp(newOtp);

    if (value && i < inputRefs.current.length - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const resendOtp = () => {
    if (userData) {
      signUpMutation.mutate(userData);
    }
  };

  return (
    <div className="w-full py-10 min-h-[85vh] bg-[#f1f1f1]">
      <h1 className="text-4xl font-Poppins font-semibold text-black text-center">
        Sing Up
      </h1>
      <p className="text-center text-lg font-medium py-3 text-[#00000099]">
        Home . Sign Up
      </p>

      <div className="w-full flex justify-center">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          <h3 className="text-3xl font-semibold text-center mb-2">
            Signup to Eshop
          </h3>

          <p className="text-center text-gray-400 mb-4">
            Already have an account{' '}
            <Link href="/login" className="text-blue-500">
              Login
            </Link>
          </p>

          <div className="flex items-center justify-center py-3">
            <GoogleButton />
          </div>

          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 bottom-t border-gray-300" />
            <span className="px-3">or Sign in with email</span>
            <div className="flex-1 bottom-t border-gray-300" />
          </div>

          {!showOtp ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <label className="block text-gray-700 mb-1">Name</label>
              <input
                type="text"
                placeholder="Name"
                className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
                {...register('name', {
                  required: 'Name is required!',
                })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">
                  {String(errors.name.message)}
                </p>
              )}

              <label className="block text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="email@gmail.com"
                className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
                {...register('email', {
                  required: 'Email is required!',
                  pattern: {
                    value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/,
                    message: 'Invalid email adress',
                  },
                })}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">
                  {String(errors.email.message)}
                </p>
              )}

              <label className="block text-gray-700 mb-1">Passport</label>
              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="Min. 6 character"
                  className="w-full p-2 border border-gray-300 outline-0 !rounded mb-1"
                  {...register('password', {
                    required: 'Password is required!',
                    minLength: {
                      value: 6,
                      message: 'Invalid password',
                    },
                  })}
                />

                <button
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                  type="button"
                  onClick={() => setPasswordVisible((prev) => !prev)}
                >
                  {passwordVisible ? <Eye /> : <EyeOff />}
                </button>
                {errors.password && (
                  <p className="text-red-500 text-sm">
                    {String(errors.password.message)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={signUpMutation.isPending}
                className="w-full text-lg cursor-pointer mt-4 bg-black text-white py-2 rounded-lg"
              >
                {signUpMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Signup'
                )}
              </button>
            </form>
          ) : (
            <div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Enter OTP
              </h3>

              <div className="flex justify-center gap-6">
                {otp?.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el;
                    }}
                    maxLength={1}
                    className="size-12 text-center border border-gray-300 outline-none !rounded"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  />
                ))}
              </div>
              <button
                disabled={verifyOtpMutation.isPending}
                onClick={() => verifyOtpMutation.mutate()}
                className="w-full mt-4 text-lg cursor-pointer bg-blue-500 text-white py-2 rounded-lg"
              >
                {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
              </button>
              <p className="text-center text-sm mt-4">
                {canResend ? (
                  <button
                    onClick={resendOtp}
                    className="text-blue-500 cursor-pointer"
                  >
                    Resend OTP
                  </button>
                ) : (
                  `Resend OTP in ${timer}`
                )}
              </p>
              {verifyOtpMutation?.isError &&
                verifyOtpMutation.error instanceof AxiosError && (
                  <p className="text-red-500 text-sm mt-2">
                    {verifyOtpMutation.error.response?.data?.message ||
                      verifyOtpMutation.error.message}
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUp;
