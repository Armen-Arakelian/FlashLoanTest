const FlashLoanTest = artifacts.require('FlashLoanTest');

contract('FlashLoanTest', async (accounts) => {
  let flashLoanTest;
  const lendingPoolAddressesProvider = '0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5';

  before('setup', async () => {
    flashLoanTest = await FlashLoanTest.new(lendingPoolAddressesProvider);
  });

  describe('Deploy and configure FlashLoanTest contract', async () => {
    it('', async () => {

      await flashLoanTest.send(10000000000000000);
      const result = await flashLoanTest.flashLoan();
      console.log(result.logs[0].event);
    });
  });
});
