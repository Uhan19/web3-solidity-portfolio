//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";

/// @title ICO contract for SpaceCoin
/// @notice this contract is responsible for managing the ICO
/// @dev allows owner to move ICO phase forward, pause the ICO, allows contributors to contribute and redeem SPC tokens
contract ICO {
    enum Phases {
        SEED,
        GENERAL,
        OPEN
    }
    address public immutable OWNER;
    address public immutable SPC_ADDRESS;
    address public immutable TREASURY_ADDRESS;
    Phases public currentPhase;

    uint256 public immutable TOKEN_REDEEM_RATIO = 5;
    uint256 public totalContributions;

    bool public isPaused;

    mapping(address => uint256) public contributions;
    mapping(address => bool) public seedWhiteList;

    event PauseToggled(bool);
    event ContributionMade(address, uint256);
    event TokenRedeemed(address, uint256);
    event PhaseAdvanced(Phases);

    error WithdrawNotAuthorized();
    error WithdrawFailed();
    error CannotWithdrawBeforeOpenPhase(Phases currentPhase);

    /// @param _seedWhiteList list of addresses that are allowed to contribute during the seed phase
    /// @param _treasury address of the treasury contract
    /// @dev deploys a new SpaceCoin contract and sets the owner of the ICO to the deployer
    constructor(address[] memory _seedWhiteList, address _treasury) {
        OWNER = msg.sender;
        TREASURY_ADDRESS = _treasury;
        for (uint256 i = 0; i < _seedWhiteList.length; i++) {
            seedWhiteList[_seedWhiteList[i]] = true;
        }
        SpaceCoin spacecoin = new SpaceCoin(OWNER, _treasury, address(this));
        SPC_ADDRESS = address(spacecoin);
    }

    /// @dev make sure the msg.sender is the owner of the contract
    modifier _onlyOwner() {
        require(msg.sender == OWNER, "Caller is not the owner");
        _;
    }

    /// @dev check to make sure that the state of the contract is not paused
    modifier _onlyNotPaused() {
        require(!isPaused, "ICO is paused");
        _;
    }

    /// @notice allows the owner to advance ICO phase
    /// @dev owner of the ICO can move phase forward, but not back
    function advanceICOPhase() external _onlyOwner {
        require(currentPhase != Phases.OPEN, "ICO is already in open phase");
        if (currentPhase == Phases.GENERAL) currentPhase = Phases.OPEN;
        if (currentPhase == Phases.SEED) currentPhase = Phases.GENERAL;
        emit PhaseAdvanced(currentPhase);
    }

    /// @dev allows the owner of the contract to pause the ICO
    function togglePauseState() external _onlyOwner {
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }

    /// @notice let investor contribute ETH to the ICO based on phase requirements
    /// @dev whitelist only during seed phase, each phase has an individual limit, except open phase. All phases have a total limit
    function contribute() public payable _onlyNotPaused {
        require(
            totalContributions + msg.value <= 30000 ether,
            "Total ICO contribution limit met"
        );
        require(msg.value > 0, "Contribution amount must be greater than 0");
        if (currentPhase == Phases.SEED) {
            require(
                seedWhiteList[msg.sender],
                "Contributor is not on the whitelist"
            );
            require(
                contributions[msg.sender] + msg.value <= 1500 ether,
                "Individual contribution limit met"
            );
            require(
                totalContributions + msg.value <= 15000 ether,
                "Seed phase contribution limit met"
            );
        } else if (currentPhase == Phases.GENERAL) {
            require(
                contributions[msg.sender] + msg.value <= 1000 ether,
                "Individual contribution limit met"
            );
        }
        contributions[msg.sender] += msg.value;
        totalContributions += msg.value;
        emit ContributionMade(msg.sender, msg.value);
    }

    /// @notice Moves invested funds from the ICO contract
    /// @dev only treasury can withdraw funds, only possible after ICO is moved to the OPEN phase
    function withdraw() public {
        if(msg.sender != TREASURY_ADDRESS) revert WithdrawNotAuthorized();
        if(currentPhase != Phases.OPEN) revert CannotWithdrawBeforeOpenPhase(currentPhase);
        (bool success, ) = TREASURY_ADDRESS.call{value: address(this).balance}("");
        if (!success) revert WithdrawFailed();
    }


    /// @notice allows contributors to redeem their SPC tokens after the ICO is moved to the OPEN phase
    /// @dev call transfer from the SpaceCoin contract to transfer the tokens to the contributor
    function redeemSPC() public _onlyNotPaused {
        require(
            currentPhase == Phases.OPEN,
            "ICO not yet in the open phase, redemption not possible"
        );
        require(
            contributions[msg.sender] > 0,
            "Contributor has no contributions to redeem"
        );
        uint256 contributionAmount = contributions[msg.sender];
        contributions[msg.sender] -= contributionAmount;
        SpaceCoin spacecoin = SpaceCoin(SPC_ADDRESS);
        spacecoin.transfer(msg.sender, contributionAmount * TOKEN_REDEEM_RATIO);
        emit TokenRedeemed(msg.sender, contributionAmount * TOKEN_REDEEM_RATIO);
    }
}
