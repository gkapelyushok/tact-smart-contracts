import { Address, Contract, toNano, beginCell } from "@ton/core";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { Parent } from "../wrappers/Parent"; 
import { Child } from "../wrappers/Child";
 
describe("Parent and Child Contract Tests", () => {
    let blockchain: Blockchain;
    let parent: SandboxContract<Parent>;
    let deployer: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");

        parent = blockchain.openContract(await Parent.fromInit());
        await parent.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
    });

    it("should deploy and increment Child contracts correctly", async () => {
        for (let i = 0; i < 3; i++) {
            await parent.send(
                deployer.getSender(),
                { value: toNano('0.5')},
                "deploy child"
            )
        }
        const childContracts: SandboxContract<Child>[] = [];
        for (let i = 1; i <= 3; i++) {
            const childInit = await Child.fromInit(BigInt(i));

            const child = blockchain.openContract(childInit);

            childContracts.push(child);
        }

        await parent.send(
            deployer.getSender(),
            { value: toNano('0.5')},
            {
                $$type: "IncrementChild",
                seqno: BigInt(1),
            }
        )

        await parent.send(
            deployer.getSender(),
            { value: toNano('0.5')},
            {
                $$type: "IncrementChild",
                seqno: BigInt(2),
            }
        )
        await parent.send(
            deployer.getSender(),
            { value: toNano('0.5')},
            {
                $$type: "IncrementChild",
                seqno: BigInt(2),
            }
        )

        for (let j = 0; j < 3; j++) {
            await parent.send(
                deployer.getSender(),
                { value: toNano('0.5')},
                {
                    $$type: "IncrementChild",
                    seqno: BigInt(3),
                }
            )
        }

        for (let i = 0; i < 3; i++) {
            const child = childContracts[i]

            const result = await child.getI();

            expect(result).toBe(BigInt(i + 1));
        }
    });
});
