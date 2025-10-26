// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DailyTicket - enforces one on-chain play ticket per 24h
contract DailyTicket {
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => uint256) public lastPlay;

    event TicketClaimed(address indexed player, uint256 timestamp);

    /// @notice Claims the right to play once per cooldown window.
    function claimDailyTicket() external {
        require(canPlay(msg.sender), "COOLDOWN_ACTIVE");
        lastPlay[msg.sender] = block.timestamp;
        emit TicketClaimed(msg.sender, block.timestamp);
    }

    /// @notice Returns true when the caller can claim a ticket.
    function canPlay(address player) public view returns (bool) {
        uint256 last = lastPlay[player];
        return last == 0 || block.timestamp >= last + COOLDOWN;
    }

    /// @notice Next timestamp the address becomes eligible again.
    function nextEligibleTimestamp(address player) external view returns (uint256) {
        uint256 last = lastPlay[player];
        if (last == 0) {
            return block.timestamp;
        }
        return last + COOLDOWN;
    }
}
