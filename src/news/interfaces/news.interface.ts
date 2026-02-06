export interface News {
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}
