import "@stdlib/deploy";
import "./jetton/messages";

contract LockChild with Deployable{
    master: Address;
    owner: Address;
    lockedAmount: Int;

    contractJettonWallet: Address?;

    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
        self.lockedAmount = 0;
    }

    receive() {
    }

    receive(msg: TokenNotification) {
        let ctx: Context = context();
        require(ctx.value >= ton("0.1"), "not enough value");
        // Check the sender is from the Jetton Wallet
        if (self.contractJettonWallet == null) {
            self.contractJettonWallet = context().sender;
        }
        require(ctx.sender == self.contractJettonWallet, "not from one of any jetton wallet");
        require(msg.from == self.owner, "not owner");
        self.lockedAmount = self.lockedAmount + msg.amount;
    }

    receive("unlock") {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "not owner");
        require(self.lockedAmount > 0, "not locked amount");
        let forward_payload: Slice = beginCell().storeUint(0, 8).asSlice();
        send(SendParameters{
                to: self.contractJettonWallet!!,
                value: 0,
                mode: (SendRemainingValue + SendIgnoreErrors),
                bounce: false, 
                body: TokenTransfer{
                    query_id: 0,
                    amount: self.lockedAmount,
                    destination: ctx.sender,
                    response_destination: self.contractJettonWallet!!,
                    custom_payload: null,
                    forward_ton_amount: ton("0.1"),
                    forward_payload: forward_payload
                }.toCell()
            }
        );
        self.lockedAmount = 0;

    }

    get fun getLockedAmount(): Int {
        return self.lockedAmount;
    }

}

contract Lock with Deployable {
    owner: Address;

    init() {
       self.owner = context().sender; 
    }

    get fun get_lock_child_address(owner: Address): Address {
        let winit: StateInit = self.getLockChildInit(owner);
        return contractAddress(winit);
    }

    fun getLockChildInit(address: Address): StateInit {
        return initOf LockChild(myAddress(), address);
    }
}