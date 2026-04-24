import type { RequestHandler } from 'express';

import { getEnv } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';

type TurnstileResponse = {
  success: boolean;
  'error-codes'?: string[];
};

export const verifyBotProtection: RequestHandler = async (req, _res, next) => {
  try {
    const env = getEnv();

    if (!env.BOT_PROTECTION_ENABLED) {
      next();
      return;
    }

    const token = typeof req.body?.botProtectionToken === 'string' ? req.body.botProtectionToken.trim() : '';

    if (!token) {
      throw new HttpError(400, 'Bot verification is required before creating a booking.');
    }

    const formData = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY!,
      response: token,
    });

    if (req.ip) {
      formData.set('remoteip', req.ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new HttpError(502, 'Bot verification service is unavailable.');
    }

    const payload = (await response.json()) as TurnstileResponse;

    if (!payload.success) {
      throw new HttpError(400, 'Bot verification failed. Please try again.', {
        codes: payload['error-codes'] ?? [],
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};