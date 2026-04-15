import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error.js';
import { getFirebaseAdminAuth } from '../firebase/firebase-admin.js';
import { getAdminContextByFirebaseUid } from '../modules/admin/admin.service.js';

export const requireAdminAuth: RequestHandler = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing bearer token');
    }

    const idToken = authorizationHeader.slice('Bearer '.length).trim();

    if (!idToken) {
      throw new HttpError(401, 'Missing bearer token');
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const adminContext = await getAdminContextByFirebaseUid(decodedToken.uid);

    if (!adminContext) {
      throw new HttpError(403, 'Access denied. Contact the system admin.');
    }

    res.locals.adminContext = adminContext;
    next();
  } catch (error) {
    next(error);
  }
};