//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./Project.sol";

contract ProjectFactory {
    event ProjectCreated(address newProject);
    address[] public deployedProjects;
    function create(uint256 _fundingGoal) external {
        address newProject = address( new Project(msg.sender, _fundingGoal));
        deployedProjects.push(newProject);
        emit ProjectCreated(newProject);
    }
}
