declare module "midtrans-client" {
  type SnapTransactionParameter = {
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };
    customer_details?: {
      first_name?: string;
      phone?: string;
    };
  };

  type SnapTransactionResponse = {
    token: string;
    redirect_url?: string;
  };

  type SnapInstance = {
    createTransaction(
      parameter: SnapTransactionParameter
    ): Promise<SnapTransactionResponse>;
  };

  const midtransClient: {
    Snap: new (options: {
      isProduction: boolean;
      serverKey: string;
    }) => SnapInstance;
  };

  export default midtransClient;
}
