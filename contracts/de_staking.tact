import "@stdlib/ownable";
import "./jetton";

message Stake {
    amount: Int;
}

message SendTokens {
    amount: Int;
    to: Address;
}

contract StakingMaster with Ownable {
    percent: Int;
    owner: Address;
    contractJettonWallet: Address?;

    init(owner: Address, percent: Int){
        self.owner = owner;
        self.percent = percent;
    }

    receive(stake: TokenNotification) {
        if (self.contractJettonWallet == null) {
            self.contractJettonWallet = context().sender;
        }
        let childInit = initOf StakingChild(myAddress(), stake.from, self.percent);
        let childAddress = contractAddress(childInit);
        send(SendParameters{
            to: childAddress,
            value: 0,
            mode: SendRemainingValue,
            body: Stake {
                amount: stake.amount,
            }.toCell(),
            code: childInit.code,
            data: childInit.data,
        });
    }

    receive(msg: SendTokens) {
        send(SendParameters{
            to: self.contractJettonWallet!!,
            value: 0,
            mode: SendRemainingValue,
            body: TokenTransfer{
                query_id: 0,
                amount: msg.amount,
                destination: msg.to,
                response_destination: myAddress(),
                custom_payload: null,
                forward_ton_amount: 0,
                forward_payload: emptySlice()
            }.toCell()
        });
    }
}

struct StakeRecord {
    jettonStakeAmount: Int as coins;
    stake_time: Int as uint32;
}

message ClaimReward {
}

message Unstake {
}

contract StakingChild {
    master: Address;
    owner: Address;
    balance: Int;
    reward: Int;
    start_time: Int;
    percent: Int;

    init(master: Address, owner: Address, percent: Int) {
        self.master = master;
        self.owner = owner;
        self.percent = percent;
        self.balance = 0;
        self.reward = 0;
        self.start_time = now();
    }

    receive(msg: Stake) {
        let ctx: Context = context();
        require(ctx.sender == self.master, "receive Stake only from master");

        self.balance = self.balance + msg.amount; 
    }

    receive(msg: ClaimReward) {
        self.reward = self.reward + self.apr();
        self.start_time = now();
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                amount: self.reward,
                to: self.owner,
            }.toCell()
        });
        self.reward = 0;
    }

    receive(msg: Unstake) {
        self.reward = self.reward + self.apr();
        self.start_time = now();
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                amount: self.balance + self.reward,
                to: self.owner,
            }.toCell()
        });
        self.balance = 0;
        self.reward = 0;
    }

    fun apr(): Int {
        return self.balance * self.percent * (now() - self.start_time) / (365 * 24 * 3600 * 100);
    }
}