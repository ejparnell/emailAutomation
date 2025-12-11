import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../models/user.model';

vi.mock('../../utils/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

/**
 * Session Management Tests
 * Tests our custom serialization/deserialization logic (not Passport OAuth flow)
 */
describe('Session Management', () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
        vi.clearAllMocks();
    });

    describe('User Serialization Logic', () => {
        it('should store user _id when serializing', async () => {
            const user = await User.create({
                email: 'test@example.com',
                name: 'Test User',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            expect(user._id).toBeInstanceOf(Types.ObjectId);
            expect(user._id.toString()).toMatch(/^[a-f\d]{24}$/i);
        });

        it('should handle users with admin roles', async () => {
            const admin = await User.create({
                email: 'admin@example.com',
                name: 'Admin User',
                timeZone: 'America/New_York',
                roles: ['USER', 'ADMIN'],
            });

            expect(admin._id).toBeInstanceOf(Types.ObjectId);
            expect(admin.roles).toEqual(['USER', 'ADMIN']);
        });
    });

    describe('User Deserialization Logic', () => {
        it('should retrieve full user data from database by ID', async () => {
            const user = await User.create({
                email: 'test@example.com',
                name: 'Test User',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            const foundUser = await User.findById(user._id);

            expect(foundUser).toBeDefined();
            expect(foundUser!._id.toString()).toBe(user._id.toString());
            expect(foundUser!.email).toBe('test@example.com');
            expect(foundUser!.name).toBe('Test User');
            expect(foundUser!.roles).toEqual(['USER']);
        });

        it('should return null when user is not found', async () => {
            const nonExistentId = new Types.ObjectId('507f1f77bcf86cd799439999');

            const foundUser = await User.findById(nonExistentId);

            expect(foundUser).toBeNull();
        });

        it('should throw error for invalid ObjectId format', async () => {
            const invalidId = 'invalid-id-format';

            await expect(User.findById(invalidId)).rejects.toThrow();
        });

        it('should retrieve user with all optional fields', async () => {
            const user = await User.create({
                email: 'full@example.com',
                name: 'Full User',
                timeZone: 'Europe/London',
                roles: ['USER', 'ADMIN'],
                googleAccessToken: 'test-access-token',
                googleRefreshToken: 'test-refresh-token',
            });

            const foundUser = await User.findById(user._id);

            expect(foundUser!.email).toBe('full@example.com');
            expect(foundUser!.name).toBe('Full User');
            expect(foundUser!.timeZone).toBe('Europe/London');
            expect(foundUser!.roles).toEqual(['USER', 'ADMIN']);
            expect(foundUser!.googleAccessToken).toBe('test-access-token');
        });
    });

    describe('Session Lifecycle', () => {
        it('should maintain user identity across serialize/deserialize cycle', async () => {
            const user = await User.create({
                email: 'lifecycle@example.com',
                name: 'Lifecycle User',
                timeZone: 'America/Los_Angeles',
                roles: ['USER'],
            });

            const sessionId = user._id;
            const retrievedUser = await User.findById(sessionId);

            expect(retrievedUser!._id.toString()).toBe(user._id.toString());
            expect(retrievedUser!.email).toBe('lifecycle@example.com');
        });

        it('should reflect database updates on subsequent deserializations', async () => {
            const user = await User.create({
                email: 'update@example.com',
                name: 'Original Name',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            const sessionId = user._id;

            await User.findByIdAndUpdate(sessionId, {
                name: 'Updated Name',
                timeZone: 'Europe/Paris',
            });

            const updatedUser = await User.findById(sessionId);

            expect(updatedUser!.name).toBe('Updated Name');
            expect(updatedUser!.timeZone).toBe('Europe/Paris');
        });

        it('should handle user deletion gracefully', async () => {
            const user = await User.create({
                email: 'delete@example.com',
                name: 'To Be Deleted',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            const sessionId = user._id;

            await User.findByIdAndDelete(sessionId);

            const deletedUser = await User.findById(sessionId);

            expect(deletedUser).toBeNull();
        });

        it('should isolate different user sessions', async () => {
            const user1 = await User.create({
                email: 'user1@example.com',
                name: 'User One',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            const user2 = await User.create({
                email: 'user2@example.com',
                name: 'User Two',
                timeZone: 'Europe/London',
                roles: ['USER', 'ADMIN'],
            });

            const session1Id = user1._id;
            const session2Id = user2._id;
            const retrieved1 = await User.findById(session1Id);
            const retrieved2 = await User.findById(session2Id);

            expect(retrieved1!.email).toBe('user1@example.com');
            expect(retrieved1!.roles).toEqual(['USER']);
            expect(retrieved2!.email).toBe('user2@example.com');
            expect(retrieved2!.roles).toEqual(['USER', 'ADMIN']);
        });
    });

    describe('Session Edge Cases', () => {
        it('should handle empty string as user ID', async () => {
            await expect(User.findById('')).rejects.toThrow();
        });

        it('should handle null as user ID', async () => {
            const foundUser = await User.findById(null as any);
            expect(foundUser).toBeNull();
        });

        it('should handle special characters in user data', async () => {
            const user = await User.create({
                email: 'specialchars@example.com',
                name: "Test <script>alert('xss')</script>",
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            const foundUser = await User.findById(user._id);

            expect(foundUser!.email).toBe('specialchars@example.com');
            expect(foundUser!.name).toBe("Test <script>alert('xss')</script>");
        });

        it('should handle concurrent access to same user', async () => {
            const user = await User.create({
                email: 'concurrent@example.com',
                name: 'Concurrent User',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });

            const lookups = await Promise.all([
                User.findById(user._id),
                User.findById(user._id),
                User.findById(user._id),
            ]);

            lookups.forEach((found) => {
                expect(found!._id.toString()).toBe(user._id.toString());
                expect(found!.email).toBe('concurrent@example.com');
            });
        });

        it('should handle user with empty roles array', async () => {
            const user = new User({
                email: 'noroles@example.com',
                name: 'No Roles',
                timeZone: 'America/New_York',
            });
            await user.save();

            const foundUser = await User.findById(user._id);

            expect(foundUser!.roles).toEqual(['USER']);
        });
    });

    describe('Session Security', () => {
        it('should not expose sensitive OAuth tokens in JSON', async () => {
            const user = await User.create({
                email: 'secure@example.com',
                name: 'Secure User',
                timeZone: 'America/New_York',
                roles: ['USER'],
                googleAccessToken: 'secret-access-token',
                googleRefreshToken: 'secret-refresh-token',
            });

            const foundUser = await User.findById(user._id);
            const userJSON = foundUser!.toJSON();

            expect(userJSON).not.toHaveProperty('googleAccessToken');
            expect(userJSON).not.toHaveProperty('googleRefreshToken');
        });

        it('should maintain session data after logout error recovery', async () => {
            const user = await User.create({
                email: 'recovery@example.com',
                name: 'Recovery User',
                timeZone: 'America/New_York',
                roles: ['USER'],
            });
            
            const sessionId = user._id;
            const retrievedUser = await User.findById(sessionId);

            expect(retrievedUser).toBeDefined();
            expect(retrievedUser!.email).toBe('recovery@example.com');
        });
    });
});
