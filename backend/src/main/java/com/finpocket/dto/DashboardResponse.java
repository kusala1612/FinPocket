package com.finpocket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private boolean success;
    private String fullName;
    private String email;
    private String role;

    // Financial summary - zeroed until modules are implemented
    @Builder.Default
    private double totalBalance = 0.0;
    @Builder.Default
    private double totalIncome = 0.0;
    @Builder.Default
    private double totalExpenses = 0.0;
    @Builder.Default
    private double currentBudget = 0.0;

    // Counts
    @Builder.Default
    private int totalTransactions = 0;
    @Builder.Default
    private int activeBudgets = 0;
    @Builder.Default
    private int savingGoals = 0;
}
