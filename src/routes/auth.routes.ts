import { Router } from 'express';
import {
    googleLogin,
    googleCallback,
    authSuccess,
    authFailure,
    logout,
    getCurrentUser,
} from '../controllers/auth.controller';
import { requireUser } from '../middleware';

const router = Router();

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth login
 * @access  Public
 */
router.get('/google', googleLogin);

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback URL
 * @access  Public
 */
router.get('/google/callback', googleCallback);

/**
 * @route   GET /auth/success
 * @desc    OAuth success handler
 * @access  Public
 */
router.get('/success', authSuccess);

/**
 * @route   GET /auth/failure
 * @desc    OAuth failure handler
 * @access  Public
 */
router.get('/failure', authFailure);

/**
 * @route   GET /auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.get('/logout', logout);

/**
 * @route   GET /auth/user
 * @desc    Get current user
 * @access  Private
 */
router.get('/user', requireUser, getCurrentUser);

export default router;
