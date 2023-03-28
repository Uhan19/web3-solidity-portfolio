// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "forge-std/Script.sol";

import "../src/Logic.sol";
import "../src/LogicImproved.sol";
import "../src/Proxy.sol";
import "../src/Proxiable.sol";

contract DeployScript is Script {
    function run() public {
    // wallet privateKey 
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);
        Logic logic = new Logic();
        Proxy proxy = new Proxy(address(logic));

        Logic proxyLogic = Logic(address(proxy));
        proxyLogic.initialize(758);
        proxyLogic.transferOwnership(0x317f48ae78D40ce6E3a17C1bFdfa8Ec1F33cd275);
        LogicImproved logicImproved = new LogicImproved();
        vm.stopBroadcast();
    }
}