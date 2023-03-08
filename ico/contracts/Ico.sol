//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";

contract ICO {
    enum Phases {
        SEED,
        GENERAL,
        OPEN
    }
    address public owner;
    SpaceCoin public spacecoin;
    Phases public phase;

    uint8 public constant TOKEN_REDEEM_RATIO = 5;
    uint256 public totalContribution;

    bool public isPaused;

    mapping(address => uint256) contributions;
    mapping(address => bool) seedWhiteList;

    event ICOActiveState(bool);
    event ContributionMade(address, uint256);
    event TokenRedeemed(address, uint256);
    event ICOPhaseChanged(Phases);

    constructor(
        address[] memory _seedWhiteList,
        address _treasury,
        uint256 _maxTotalSupply,
        uint256 _initialSupply
    ) {
        owner = msg.sender;
        for (uint256 i = 0; i < _seedWhiteList.length; i++) {
            seedWhiteList[_seedWhiteList[i]] = true;
        }
        spacecoin = new SpaceCoin(_treasury, _maxTotalSupply, _initialSupply);
    }

    /// @dev make sure the msg.sender is the owner of the contract
    modifier _onlyOwner() {
        require(msg.sender == owner, "Only the owner is allowed");
        _;
    }

    /// @dev check to make sure that the state of the contract is not paused
    modifier _onlyNotPaused() {
        require(!isPaused, "ICO is paused");
        _;
    }

    /// @dev owner of the ICO can move phase forward, but not back
    function advanceICOPhase() external _onlyOwner {
        require(phase == Phases.OPEN, "Project already in open phase");
        if (phase == Phases.SEED) phase = Phases.GENERAL;
        if (phase == Phases.GENERAL) phase = Phases.OPEN;
        emit ICOPhaseChanged(phase);
    }

    /// @dev allows the owner of the contract to pause the ICO
    function toggleICOActiveState() external _onlyOwner {
        isPaused = !isPaused;
        emit ICOActiveState(isPaused);
    }

    /// @dev let investor contribute ETH to the ICO based on phase requirements
    function contribute() public payable _onlyNotPaused {
        require(
            totalContribution + msg.value <= 30000 ether,
            "Total ICO contribution limit met"
        );
        if (phase == Phases.SEED) {
            require(seedWhiteList[msg.sender], "Address not on whitelist");
            require(
                contributions[msg.sender] + msg.value <= 1500 ether,
                "Individual contribution limit met"
            );
            require(
                totalContribution + msg.value <= 15000 ether,
                "Seed phase contribution limit met"
            );
        } else if (phase == Phases.GENERAL) {
            require(
                contributions[msg.sender] + msg.value <= 1000 ether,
                "Individual contribution limit met"
            );
        }
        contributions[msg.sender] += msg.value;
        totalContribution += msg.value;
        emit ContributionMade(msg.sender, msg.value);
    }

    /// @dev allows contributors to redeem their SPC tokens after the ICO is moved to the OPEN phase
    function redeemSPC() public _onlyNotPaused {
        require(
            phase == Phases.OPEN,
            "ICO not yet in the open phase, redemption not possible"
        );
        uint256 contributionAmount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        spacecoin.transfer(msg.sender, contributionAmount * TOKEN_REDEEM_RATIO);
        emit TokenRedeemed(msg.sender, contributionAmount * TOKEN_REDEEM_RATIO);
    }
}
