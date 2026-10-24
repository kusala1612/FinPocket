package com.finpocket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private boolean success;
    private String adminName;

    // System statistics
    private long totalUsers;
    private long totalAdmins;
    private long totalRegularUsers;

    // Recent registrations
    private List<UserDto> recentUsers;

    // System info
    private String systemStatus;
    private String serverTime;
}
