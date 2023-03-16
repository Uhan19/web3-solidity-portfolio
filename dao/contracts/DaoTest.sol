// // SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract DaoTest {
    /// @notice creates a proposal Id by hashing the encoded parameters
    /// @param targets The address of the contract to call
    /// @param values The amount of ETH to send
    /// @param calldatas The data to pass to the function
    /// @param proposalCount The current number of proposals
    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 proposalCount
    ) public pure returns (uint256) {
        return
            uint256(
                keccak256(abi.encode(targets, values, calldatas, proposalCount))
            );
    }
}
