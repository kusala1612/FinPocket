package com.finpocket.service;

import com.finpocket.dto.AdminDashboardResponse;
import com.finpocket.dto.UserDto;
import com.finpocket.entity.Role;
import com.finpocket.entity.User;
import com.finpocket.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;

    public AdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public AdminDashboardResponse getDashboard(String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Admin not found"));

        long totalUsers = userRepository.count();
        long totalAdmins = userRepository.countByRole(Role.ADMIN);
        long totalRegularUsers = userRepository.countByRole(Role.USER);

        List<UserDto> recentUsers = userRepository.findTop10ByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToUserDto)
                .collect(Collectors.toList());

        return AdminDashboardResponse.builder()
                .success(true)
                .adminName(admin.getFullName())
                .totalUsers(totalUsers)
                .totalAdmins(totalAdmins)
                .totalRegularUsers(totalRegularUsers)
                .recentUsers(recentUsers)
                .systemStatus("Online")
                .serverTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::mapToUserDto)
                .collect(Collectors.toList());
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
