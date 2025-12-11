import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    name: string;
    timeZone: string;
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
        return ret;
    },
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
