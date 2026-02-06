export interface Reward {
    id: number;
    title: string;
    description?: string;
    pointsRequired: number;
    stock: number;
    imageUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RewardRedemption {
    id: number;
    customerId: number;
    rewardId: number;
    pointsUsed: number;
    status: 'pending' | 'claimed' | 'cancelled';
    createdAt: Date;
}
