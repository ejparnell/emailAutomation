import passport from 'passport';
import {
    Strategy as GoogleStrategy,
    Profile,
    VerifyCallback,
} from 'passport-google-oauth20';
import User, { IUser } from '../models/user.model';
import Logger from '../utils/logger';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL =
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3000/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    Logger.warn(
        'Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.'
    );
}

passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email'],
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: Profile,
            done: VerifyCallback
        ) => {
            try {
                Logger.info(
                    `Google OAuth callback for user: ${profile.emails?.[0]?.value}`
                );

                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error('No email found in Google profile'));
                }

                let name = profile.displayName;
                if (!name) {
                    const firstName = profile.name?.givenName || '';
                    const lastName = profile.name?.familyName || '';
                    name = `${firstName} ${lastName}`.trim();
                }
                if (!name) {
                    name = email.split('@')[0];
                }

                let user = await User.findOne({ email });

                if (user) {
                    user.googleAccessToken = accessToken;
                    if (refreshToken) {
                        user.googleRefreshToken = refreshToken;
                    }
                    await user.save();
                    Logger.info(`Existing user logged in: ${email}`);
                    return done(null, user);
                }

                user = new User({
                    email,
                    name,
                    timeZone: 'America/New_York',
                    googleAccessToken: accessToken,
                    googleRefreshToken: refreshToken,
                });

                await user.save();
                Logger.info(`New user created via Google OAuth: ${email}`);

                return done(null, user);
            } catch (error) {
                Logger.error('Error in Google OAuth strategy:', error);
                return done(error as Error);
            }
        }
    )
);

passport.serializeUser((user: Express.User, done) => {
    const userDoc = user as IUser;
    done(null, userDoc._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        Logger.error('Error deserializing user:', error);
        done(error);
    }
});

export default passport;
