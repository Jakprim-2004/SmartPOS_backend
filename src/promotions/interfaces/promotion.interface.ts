export interface Promotion {
    id: number;
    title: string;
    description?: string;
    image_url?: string | null;
    discountType?: 'percentage' | 'fixed' | 'buy_x_get_y' | null;
    discountValue?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    isActive: boolean;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}
