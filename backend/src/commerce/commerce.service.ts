import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EntitlementEntity } from './entitlement.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrderEntity } from './order.entity';
import { RefundEntity } from './refund.entity';
import type { PaymentProvider, ProductType } from './commerce.types';

export type OrderLineInput = {
  productType: ProductType;
  productId: string;
  amountCents: number;
  payeeId?: string | null;
};

@Injectable()
export class CommerceService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderLineEntity)
    private readonly lines: Repository<OrderLineEntity>,
    @InjectRepository(EntitlementEntity)
    private readonly entitlements: Repository<EntitlementEntity>,
    @InjectRepository(RefundEntity)
    private readonly refunds: Repository<RefundEntity>,
  ) {}

  async createPendingOrder(input: {
    buyerId: string;
    provider: PaymentProvider;
    providerRef: string;
    currency?: string;
    totalCents: number;
    lines: OrderLineInput[];
  }): Promise<OrderEntity> {
    const existing = await this.orders.findOne({
      where: { providerRef: input.providerRef },
    });
    if (existing) {
      return existing;
    }
    const order = await this.orders.save(
      this.orders.create({
        buyerId: input.buyerId,
        status: 'pending',
        provider: input.provider,
        providerRef: input.providerRef,
        currency: input.currency ?? 'usd',
        totalCents: input.totalCents,
      }),
    );
    for (const line of input.lines) {
      await this.lines.save(
        this.lines.create({
          orderId: order.id,
          productType: line.productType,
          productId: line.productId,
          amountCents: line.amountCents,
          payeeId: line.payeeId ?? null,
        }),
      );
    }
    return order;
  }

  async fulfillPaidOrder(providerRef: string): Promise<OrderEntity | null> {
    const order = await this.orders.findOne({ where: { providerRef } });
    if (!order) return null;
    if (order.status === 'paid') {
      await this.ensureEntitlementsForOrder(order.id);
      return order;
    }
    order.status = 'paid';
    order.paidAt = new Date();
    await this.orders.save(order);
    await this.ensureEntitlementsForOrder(order.id);
    return order;
  }

  async recordInstantPaidOrder(input: {
    buyerId: string;
    provider: PaymentProvider;
    providerRef: string;
    currency?: string;
    totalCents: number;
    lines: OrderLineInput[];
  }): Promise<OrderEntity> {
    let order = await this.orders.findOne({
      where: { providerRef: input.providerRef },
    });
    if (!order) {
      order = await this.createPendingOrder(input);
    }
    if (order.status !== 'paid') {
      order.status = 'paid';
      order.paidAt = new Date();
      order.totalCents = input.totalCents;
      await this.orders.save(order);
    }
    await this.ensureEntitlementsForOrder(order.id);
    return order;
  }

  async findByProviderRef(providerRef: string) {
    return await this.orders.findOne({ where: { providerRef } });
  }

  async getLinesForOrder(orderId: string) {
    return await this.lines.find({ where: { orderId } });
  }

  async hasActiveEntitlement(
    userId: string,
    productType: ProductType,
    productId: string,
  ): Promise<boolean> {
    const hit = await this.entitlements.findOne({
      where: {
        userId,
        productType,
        productId,
        revokedAt: IsNull(),
      },
    });
    return Boolean(hit);
  }

  async refundOrder(
    orderId: string,
    reason?: string,
  ): Promise<{ refunded: boolean }> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || order.status === 'refunded') {
      return { refunded: false };
    }
    const orderLines = await this.lines.find({ where: { orderId } });
    for (const line of orderLines) {
      await this.refunds.save(
        this.refunds.create({
          orderId,
          orderLineId: line.id,
          amountCents: line.amountCents,
          reason: reason ?? null,
        }),
      );
      await this.entitlements.update(
        { orderLineId: line.id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
    order.status = 'refunded';
    await this.orders.save(order);
    return { refunded: true };
  }

  async refundByProviderRef(
    providerRef: string,
    reason?: string,
  ): Promise<{ refunded: boolean }> {
    const order = await this.orders.findOne({ where: { providerRef } });
    if (!order) return { refunded: false };
    return this.refundOrder(order.id, reason);
  }

  private async ensureEntitlementsForOrder(orderId: string) {
    const orderLines = await this.lines.find({ where: { orderId } });
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return;
    for (const line of orderLines) {
      const existing = await this.entitlements.findOne({
        where: {
          userId: order.buyerId,
          productType: line.productType,
          productId: line.productId,
          orderLineId: line.id,
          revokedAt: IsNull(),
        },
      });
      if (existing) continue;
      const prior = await this.entitlements.findOne({
        where: {
          userId: order.buyerId,
          productType: line.productType,
          productId: line.productId,
          revokedAt: IsNull(),
        },
      });
      if (prior) continue;
      await this.entitlements.save(
        this.entitlements.create({
          userId: order.buyerId,
          productType: line.productType,
          productId: line.productId,
          orderLineId: line.id,
        }),
      );
    }
  }
}
