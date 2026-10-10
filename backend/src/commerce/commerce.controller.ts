import { Controller, ForbiddenException, Param, Post } from '@nestjs/common';
import { CommerceService } from './commerce.service';

@Controller('commerce')
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  /** Test-only: revoke entitlements after a refund simulation. */
  @Post('test/refund/:providerRef')
  async testRefund(@Param('providerRef') providerRef: string) {
    if (process.env.NODE_ENV !== 'test') {
      throw new ForbiddenException();
    }
    return await this.commerce.refundByProviderRef(providerRef, 'test_refund');
  }
}
