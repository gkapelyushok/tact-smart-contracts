import { toNano, beginCell } from "@ton/ton";
import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
    printTransactionFees,
    prettyLogTransactions,
} from "@ton/sandbox";
import "@ton/test-utils";
import { NftCollection, RoyaltyParams, loadLogEventMintRecord } from "../wrappers/NftCollection";
import { NftItem } from "../wrappers/NftItem";
import { NftLock } from "../wrappers/NftLock";

describe("contract", () => {
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const string_first = "https://s.getgems.io/nft-staging/c/628f6ab8077060a7a8d52d63/";
    let newContent = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(string_first).endCell();

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<NftCollection>;
    let lock: SandboxContract<NftLock>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");

        let royaltiesParam: RoyaltyParams = {
            $$type: "RoyaltyParams",
            numerator: 350n, // 350n = 35%
            denominator: 1000n,
            destination: deployer.address,
        };

        collection = blockchain.openContract(
            await NftCollection.fromInit(deployer.address, newContent, royaltiesParam)
        );

        const deploy_result = await collection.send(deployer.getSender(), { value: toNano(1) }, "Mint");
        expect(deploy_result.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });

        lock = blockchain.openContract(
            await NftLock.fromInit(deployer.address)
        );

        const lockDeployResult = await lock.send(
            deployer.getSender(),
            { value: toNano(1) },
            null        
        );
    });

    it("should deploy correctly", async () => {
        const nft = blockchain.openContract(
            await NftItem.fromInit(collection.address, 0n)
        );

        const lockResult = await nft.send(
            deployer.getSender(),
            { value: toNano(1) },
            {
                $$type: "Transfer",
                query_id: 0n,
                new_owner: lock.address,
                response_destination: deployer.address,
                custom_payload: null,
                forward_amount: toNano(0.2),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        expect(lockResult.transactions).toHaveTransaction({
            from: nft.address,
            to: lock.address,
            success: true,
        });

        const nftData = await nft.getGetNftData();

        expect(nftData.owner_address).toEqualAddress(lock.address);
        expect(nftData.collection_address).toEqualAddress(collection.address);

        const unlockResult = await lock.send(
            deployer.getSender(),
            { value: toNano(0.1) },
            {
                $$type: "Unlock",
                index: 0n,
            }
        );

        expect(unlockResult.transactions).toHaveTransaction({
            from: lock.address,
            to: nft.address,
            success: true,
        });
        const nftData2 = await nft.getGetNftData();

        expect(nftData2.owner_address).toEqualAddress(deployer.address);
        expect(nftData2.collection_address).toEqualAddress(collection.address);

    });
});