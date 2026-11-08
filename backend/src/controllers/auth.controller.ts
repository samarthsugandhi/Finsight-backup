import { Request, Response, NextFunction, CookieOptions } from "express";
import { authService } from "@/services/auth.service";
import { env } from "@/config/env";
import { AppError } from "@/middlewares/error.middleware";

export const REFRESH_COOKIE_NAME = "finsight_refresh";

const getRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

const getClearCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.signup(req.body);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
      res.status(201).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
      res.json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!token) {
        throw new AppError("Refresh token missing", 401);
      }
      const { accessToken, refreshToken } = await authService.refresh(token);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
      res.json({ accessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getById(req.userId!);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.updateProfile(req.userId!, req.body);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.changePassword(req.userId!, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
