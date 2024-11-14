import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Calculator } from '../wrappers/Calculator';
import '@ton/test-utils';
import { ContractSystem } from "@tact-lang/emulator";

describe('Calculator', () => {
    let blockchain: Blockchain;
    let calculator: SandboxContract<Calculator>;
    let deployer: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");

        calculator = blockchain.openContract(await Calculator.fromInit());

        const deployResult = await calculator.send(
            deployer.getSender(),
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

        const result = await calculator.getSum(BigInt(2), BigInt(3));
        expect(result).toBe(5n);
    });

    it('should subtract two numbers', async () => {

        const result = await calculator.getSub(BigInt(5), BigInt(3));
        expect(result).toBe(2n);
    });

    it('should multiply two numbers', async () => {

        const result = await calculator.getMul(BigInt(4), BigInt(3));
        expect(result).toBe(12n);
    });

    it('should divide two numbers', async () => {

        const result = await calculator.getDiv(BigInt(10), BigInt(2));
        expect(result).toBe(5n);
    });

    it('should return absolute value', async () => {

        const result = await calculator.getAbs(BigInt(-7));
        expect(result).toBe(7n);
    });

    it('should return modulus of two numbers', async () => {

        const result = await calculator.getMod(BigInt(10), BigInt(3));
        expect(result).toBe(1n);
    });

    it('should return bitwise AND of two numbers', async () => {

        const result = await calculator.getAnd(BigInt(5), BigInt(3));
        expect(result).toBe(1n);
    });

    it('should return bitwise OR of two numbers', async () => {

        const result = await calculator.getOr(BigInt(5), BigInt(3));
        expect(result).toBe(7n);
    });
});
