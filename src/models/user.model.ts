import mongoose, { Document, Schema } from 'mongoose';

export type Role = 'USER' | 'ADMIN';

export interface IUser extends Document {
    email: string;
    name: string;
    timeZone: string;
    roles: Role[];
    googleAccessToken?: string;
    googleRefreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address',
            ],
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        timeZone: {
            type: String,
            required: true,
            default: 'America/New_York',
        },
        roles: {
            type: [String],
            enum: ['USER', 'ADMIN'],
            default: ['USER'],
        },
        googleAccessToken: {
            type: String,
        },
        googleRefreshToken: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.set('toJSON', {
    transform: function (_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.googleAccessToken;
        delete ret.googleRefreshToken;
        return ret;
    },
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
