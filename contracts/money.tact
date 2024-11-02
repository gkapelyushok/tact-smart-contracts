import "@stdlib/deploy";

contract Money with Deployable {
    lastSender: Address? = null;
    const MinTonForStorage: Int = ton("0.01");
    deployer: Address;

    init() {
        self.deployer = sender();
    }

    receive() {
        if (context().value >= 1) {
            self.lastSender = sender();
        }
    }

    get fun balance(): Int {
        return myBalance(); 
    }

    get fun lastSender(): Address? {
        return self.lastSender;
    }

    receive("withdraw") {
        require(sender() == self.deployer, "Only deployer is allowed to withdraw");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors
        });
    }
}