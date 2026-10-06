import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommerceService } from './commerce.service';
import { EntitlementEntity } from './entitlement.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrderEntity } from './order.entity';
import { RefundEntity } from './refund.entity';
import { CommerceController } from './commerce.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderLineEntity,
      EntitlementEntity,
      RefundEntity,
    ]),
  ],
  controllers: [CommerceController],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
