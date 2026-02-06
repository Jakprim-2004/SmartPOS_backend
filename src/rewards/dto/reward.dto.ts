export class CreateRewardDto {
    title: string;
    description?: string;
    pointsRequired: number;
    stock: number;
    imageUrl?: string;
}

export class UpdateRewardDto {
    title?: string;
    description?: string;
    pointsRequired?: number;
    stock?: number;
    imageUrl?: string;
    isActive?: boolean;
}

export class RedeemRewardDto {
    customerId: number;
    rewardId: number;
}
