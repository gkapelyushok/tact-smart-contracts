import "./jetton";

message Mint {
    amount: Int;
}

contract Token with Jetton {

    totalSupply: Int as coins;
    owner: Address;
    content: Cell?;
    mintable: Bool;
    percent: Int;

    init(owner: Address, content: Cell?, percent: Int) {
        require(percent <= 50 && percent > 0, "Invalid percent");
        self.totalSupply = 0;
        self.owner = owner;
        self.mintable = true;
        self.content = content;
        self.percent = percent;
    }

    override fun getJettonWalletInit(address: Address): StateInit {
        return initOf TokenWallet(myAddress(), address, self.percent, self.owner);
    }

    receive(msg: Mint) {
        let ctx: Context = context();
        self.mint(ctx.sender, msg.amount, ctx.sender);
    }

    receive("Mint!") {
        let ctx: Context = context();
        self.mint(ctx.sender, 1000000000, ctx.sender);
    }
}


contract TokenWallet {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.01");

    balance: Int;
    owner: Address;
    master: Address;

    percent: Int;
    feeAddress: Address;

    init(master: Address, owner: Address, percent: Int, feeAddress: Address) {
        self.balance = 0;
        self.owner = owner;
        self.master = master;
        self.percent = percent;
        self.feeAddress = feeAddress;
    }

    receive(msg: TokenTransfer) {

        // Check sender
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");

        let contractFeeAmount = msg.amount * self.percent / 100;
        let transferAmount = msg.amount;
        let msgValue = ctx.value;

        // Update balance
        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Invalid balance");

        // Gas checks
        let fwdFee: Int = ctx.readForwardFee();
        let fwdCount: Int = 2;
        if (msg.forward_ton_amount > 0) {
            fwdCount = 3;
        }

        let transferFee: Int = fwdCount * fwdFee + 2 * self.gasConsumption + self.minTonsForStorage;
        let firstTransferFee: Int = fwdFee + 2 * self.gasConsumption + self.minTonsForStorage;
        require(ctx.value > transferFee + ton("0.1"), "Invalid value");
        // Send tokens
        if (self.owner != self.feeAddress && contractFeeAmount > 0) {
            let feeInit: StateInit = initOf TokenWallet(
                                        self.master, 
                                        self.feeAddress, 
                                        self.percent, 
                                        self.feeAddress
            );
            let feeWalletAddress: Address = contractAddress(feeInit);
            send(SendParameters{
                to: feeWalletAddress, 
                value: ton("0.1"), 
                bounce: true,
                body: TokenTransferInternal{
                    amount: contractFeeAmount,
                    query_id: msg.query_id,
                    from: self.owner,
                    responseAddress: self.owner,
                    forward_ton_amount: 0,
                    forward_payload: emptySlice()
                }.toCell(),
                code: feeInit.code,
                data: feeInit.data
            });
            transferAmount = transferAmount - contractFeeAmount;
            msgValue = msgValue - firstTransferFee - ton("0.1");
        }        

        let init: StateInit = initOf TokenWallet(self.master, msg.destination, self.percent, self.feeAddress);
        let walletAddress: Address = contractAddress(init);
        send(SendParameters{
            to: walletAddress, 
            value: msgValue, 
            bounce: true,
            // mode: SendRemainingValue,
            body: TokenTransferInternal{
                amount: transferAmount,
                query_id: msg.query_id,
                from: self.owner,
                responseAddress: self.owner,
                forward_ton_amount: msg.forward_ton_amount,
                forward_payload: msg.forward_payload
            }.toCell(),
            code: init.code,
            data: init.data
        });
    }

    receive(msg: TokenTransferInternal) {

        // Check sender
        let ctx: Context = context();
        if (ctx.sender != self.master) {
            let sinit: StateInit = initOf TokenWallet(self.master, msg.from, self.percent, self.feeAddress);
            require(contractAddress(sinit) == ctx.sender, "Invalid sender");
        }
        // Update balance
        self.balance = self.balance + msg.amount;

        require(self.balance >= 0, "Invalid balance");


        // Adjust value for gas
        let msgValue: Int = ctx.value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.minTonsForStorage - min(tonBalanceBeforeMsg, self.minTonsForStorage);
        msgValue = msgValue - (storageFee + self.gasConsumption);
        // Forward ton
        if (msg.forward_ton_amount > 0) {
            let fwdFee: Int = ctx.readForwardFee();
            msgValue = msgValue - (msg.forward_ton_amount + fwdFee);
            send(SendParameters{
                to: self.owner,
                value: msg.forward_ton_amount,
                bounce: false,
                body: TokenNotification{
                    query_id: msg.query_id,
                    amount: msg.amount,
                    from: msg.from,
                    forward_payload: msg.forward_payload
                }.toCell()
            });
        }

        // Cashback
        if (msg.responseAddress != null && msgValue > 0) {
            send(SendParameters{
                to: msg.responseAddress!!,
                value: msgValue,
                bounce: false,
                body: TokenExcesses{
                    query_id: msg.query_id
                }.toCell()
            });
        }
    }

    receive(msg: TokenBurn) {

        // Check sender
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Invalid sender");

        // Update balance
        self.balance = self.balance - msg.amount;
        require(self.balance >= 0, "Invalid balance");

        // Gas checks
        let fwdFee: Int = ctx.readForwardFee();
        require(ctx.value > fwdFee + 2 * self.gasConsumption + self.minTonsForStorage, "Invalid value");

        // Burn tokens
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: TokenBurnNotification{
                query_id: msg.query_id,
                amount: msg.amount,
                owner: self.owner,
                responseAddress: self.owner
            }.toCell()
        });
    }

    bounced(msg: Slice) {

        // Parse bounced message
        msg.skipBits(32); // 0xFFFFFFFF
        let op: Int = msg.loadUint(32);
        let query_id: Int = msg.loadUint(64);
        let jettonAmount: Int = msg.loadCoins();
        require(op == 0x178d4519 || op == 0x7bdd97de, "Invalid bounced message");

        // Update balance
        self.balance = self.balance + jettonAmount;
    }

    get fun get_wallet_data(): JettonWalletData {
        return JettonWalletData{
            balance: self.balance,
            owner: self.owner,
            master: self.master,
            walletCode: (initOf TokenWallet(self.master, self.owner, self.percent, self.feeAddress)).code
        };
    }
}