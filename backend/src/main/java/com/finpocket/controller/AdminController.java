package com.finpocket.controller;

import com.finpocket.dto.AdminDashboardResponse;
import com.finpocket.dto.ApiResponse;
import com.finpocket.dto.UserDto;
import com.finpocket.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard(Authentication authentication) {
        AdminDashboardResponse dashboard = adminService.getDashboard(authentication.getName());
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse> getAllUsers() {
        List<UserDto> users = adminService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }
}
