package com.finpocket.controller;

import com.finpocket.dto.ApiResponse;
import com.finpocket.dto.DashboardResponse;
import com.finpocket.dto.ProfileUpdateRequest;
import com.finpocket.dto.UserDto;
import com.finpocket.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse> getCurrentUser(Authentication authentication) {
        UserDto user = userService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", user));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard(Authentication authentication) {
        DashboardResponse dashboard = userService.getDashboard(authentication.getName());
        return ResponseEntity.ok(dashboard);
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request) {
        UserDto updatedUser = userService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updatedUser));
    }
}
