import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { ValidationError } from '../../../../packages/error-handler';
import prisma from '../../../../packages/libs/prisma';
import {
  checkOtpRestrictions,
  handleForgotPassword,
  sendOtp,
  trackOtpRequests,
  validationRegistrationData,
  verifyForgotPasswordOtp,
  verifyOtp,
} from '../utils/auth.helper';
import { setCookie } from '../utils/cookies/setCookie';

// register a new user
export const userRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validationRegistrationData(req.body, 'user');

    const { name, email } = req.body;

    const existingUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return next(new ValidationError('User already exists with this email'));
    }

    await checkOtpRestrictions(email, next);
    await trackOtpRequests(email, next);
    await sendOtp(name, email, 'user-activation-mail');

    res.status(200).json({
      message: 'OTP sent to email. Please verify your email',
    });
  } catch (error) {
    return next(error);
  }
};

// verify user with OTP
export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp, password, name } = req.body;
    if (!email || !otp || !password || !name) {
      return next(new ValidationError('All field are required!'));
    }

    const existingUser = await prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return next(new ValidationError('User already exist with this email!'));
    }

    await verifyOtp(email, otp, next);
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User registrated successfully!',
    });
  } catch (error) {
    return next(error);
  }
};

// login user
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError('Email and password are required!'));
    }

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) return next(new ValidationError('User doesnt exists'));

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return next(new ValidationError('Invalid email or password!'));
    }

    const accessToken = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.ACCESS_TOKEN_JWT_SECRET as string,
      {
        expiresIn: '15m',
      }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.REFRESH_TOKEN_JWT_SECRET as string,
      {
        expiresIn: '7d',
      }
    );

    // store the refraesh and acess token in an httpOnly secure cookie
    setCookie(res, 'refresh_token', refreshToken);
    setCookie(res, 'access_token', accessToken);

    res.status(200).json({
      message: 'Login successfuly',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return next(error);
  }
};

// refresh token user
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refresh_cookies;

    if (!refreshToken) {
      throw new ValidationError('Unauthorizend! No refesh token.');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: string; role: string };

    if (!decoded || !decoded.id || decoded.role) {
      return new JsonWebTokenError('Forbidden! Invalid refresh token.');
    }

    // let account;
    // if (decoded.role === 'user')
    const user = await prisma.users.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return new Error('Foridden! User/Seller not found');
    }

    const newAcessToken = jwt.sign(
      {
        id: decoded.id,
        role: decoded.role,
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: '15m',
      }
    );

    setCookie(res, 'access_token', newAcessToken);
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

// get logged in user
export const getUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// user forgot password
export const userForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await handleForgotPassword(req, res, next, 'user');
};

// verify forgot password OTP
export const verifyUserForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await verifyForgotPasswordOtp(req, res, next);
};

// Reset user password
export const resetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return next(new ValidationError('Email and new passowrd are required!'));

    const user = await prisma.users.findUnique({
      where: {
        email,
      },
    });
    if (!user) return next(new ValidationError('User not found'));

    const isSamePassword = await bcrypt.compare(newPassword, user.password!);

    if (isSamePassword) {
      return next(
        new ValidationError(
          'New password cannot be the same as the old password'
        )
      );
    }

    const hashedPassowrd = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: {
        email,
      },
      data: {
        password: hashedPassowrd,
      },
    });

    res.status(200).json({
      message: 'Password reset successfully!',
    });
  } catch (error) {
    return next(error);
  }
};
