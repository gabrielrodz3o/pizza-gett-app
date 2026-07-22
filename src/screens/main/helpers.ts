import { Product } from '@/shared/types';

export const money = (n: number) => `RD$${n.toLocaleString('es-DO')}`;

export const promotionLabel = (product: Product) => {
  const promotion = product.promotion;
  if (!promotion) return '';
  if (promotion.type === 'DISCOUNT_PERCENTAGE')
    return `-${promotion.discountPercentage ?? 0}%`;
  if (promotion.type === 'DISCOUNT_FIXED')
    return `AHORRA ${money(promotion.discountAmount ?? 0)}`;
  if (promotion.type === 'BUY_X_GET_Y')
    return `${promotion.requiredQuantity ?? 2}+${promotion.rewardQuantity ?? 1} GRATIS`;
  return 'OFERTA';
};
