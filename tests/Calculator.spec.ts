import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Calculator } from '../wrappers/Calculator';
import '@ton/test-utils';
import { beginCoverage, completeCoverage} from "@tact-lang/coverage";
import { ContractSystem } from "@tact-lang/emulator";

describe('Calculator', () => {
    let blockchain: ContractSystem;
    let deployer: any;
    var calculator: any;

    beforeAll(() => {
        beginCoverage();
    });

    afterAll(() => {
        completeCoverage(__dirname + '/../build/Calculator/tact_Calculator.code.boc');
    });

    beforeEach(async () => {
        blockchain = await ContractSystem.create();

        calculator = blockchain.open(await Calculator.fromInit());

        deployer = await blockchain.treasure('deployer');

        const deployResult = await calculator.send(
            deployer,
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

    });


    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and calculator are ready to use
    });

    it('should add two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getSum(BigInt(2), BigInt(3));
        expect(result).toBe(5n);
    });

    it('should subtract two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getSub(BigInt(5), BigInt(3));
        expect(result).toBe(2n);
    });

    it('should multiply two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getMul(BigInt(4), BigInt(3));
        expect(result).toBe(12n);
    });

    it('should divide two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getDiv(BigInt(10), BigInt(2));
        expect(result).toBe(5n);
    });

    it('should return absolute value', async () => {
        await blockchain.run();

        const result = await calculator.getAbs(BigInt(-7));
        expect(result).toBe(7n);
    });

    it('should return modulus of two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getMod(BigInt(10), BigInt(3));
        expect(result).toBe(1n);
    });

    it('should return bitwise AND of two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getAnd(BigInt(5), BigInt(3));
        expect(result).toBe(1n);
    });

    it('should return bitwise OR of two numbers', async () => {
        await blockchain.run();

        const result = await calculator.getOr(BigInt(5), BigInt(3));
        expect(result).toBe(7n);
    });
});
