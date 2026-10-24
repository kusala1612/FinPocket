package com.finpocket.service;

import com.finpocket.dto.DashboardResponse;
import com.finpocket.dto.ProfileUpdateRequest;
import com.finpocket.dto.UserDto;
import com.finpocket.entity.User;
import com.finpocket.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return mapToUserDto(user);
    }

    public DashboardResponse getDashboard(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Financial data is zeroed until those modules are implemented
        return DashboardResponse.builder()
                .success(true)
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .totalBalance(0.0)
                .totalIncome(0.0)
                .totalExpenses(0.0)
                .currentBudget(0.0)
                .totalTransactions(0)
                .activeBudgets(0)
                .savingGoals(0)
                .build();
    }

    public UserDto updateProfile(String email, ProfileUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Only allow updating safe fields — never role or email
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        User updatedUser = userRepository.save(user);
        return mapToUserDto(updatedUser);
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
