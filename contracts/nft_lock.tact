import "./nft_message";

message Unlock {
    index: Int;
}

contract NftLock {
    owner: Address;
    nfts: map<Int, Address>;
    nextIndex: Int;

    init(owner: Address) {
        self.owner = owner;
        self.nextIndex = 0;
    }

    receive(){}

    receive(msg: OwnershipAssigned) {
        require(msg.prev_owner == self.owner, "only owner of NFT can lock");
        self.nfts.set(self.nextIndex, context().sender);
        self.nextIndex = self.nextIndex + 1;
    }

    receive(msg: Unlock) {
        require(context().sender == self.owner, "receive Unlock only from owner");
        let nft = self.nfts.get(msg.index);
        require(nft != null, "no nft with Unlock.index");
        send(SendParameters{
            to: nft!!,
            value: 0,
            mode: SendRemainingValue,
            body: Transfer {
                query_id: 0,
                new_owner: self.owner,
                response_destination: self.owner,
                custom_payload: null,
                forward_amount: 0,
                forward_payload: emptySlice()
            }.toCell()
        });
        self.nfts.del(msg.index);
    }
}